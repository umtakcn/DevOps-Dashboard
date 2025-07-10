package main

import (
	"crypto/tls"
	"crypto/x509"
	"flag"
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/go-ldap/ldap/v3"
	"github.com/golang-jwt/jwt/v4"
	"gopkg.in/yaml.v3"
)

// --- Config Structs ---
type LdapConfig struct {
	URL                 string `yaml:"url"`
	BaseDN              string `yaml:"base_dn"`
	CACertPath          string `yaml:"ca_cert_path"`
	BindUser            string `yaml:"binduser"`
	BindUserPasswordEnv string `yaml:"binduser_password_env"`
}
type ArgoTarget struct {
	ApiURL   string `yaml:"api_url"`
	Username string `yaml:"username"`
	Password string `yaml:"password"`
}
type TektonTarget struct {
	ApiURL string `yaml:"api_url"`
	Token  string `yaml:"token"`
}
type FrontendConfig struct {
	AllowedOrigins []string `yaml:"allowed_origins"`
}
type Config struct {
	Ldap     LdapConfig              `yaml:"ldap"`
	ArgoCD   map[string]ArgoTarget   `yaml:"argocd"`
	Tekton   map[string]TektonTarget `yaml:"tekton"`
	Frontend FrontendConfig          `yaml:"frontend"`
}

// --- Global Variables ---
var config Config
var argoTargets map[string]ArgoTarget
var tektonTargets map[string]TektonTarget
var jwtSecret = []byte("ÇOKGİZLİBİRKEY") // Dilersen configten de alabilirsin

// --- Config Loaders ---
func resolveEnvVars(target *ArgoTarget) {
	re := regexp.MustCompile(`\$\{([A-Z0-9_]+)\}`)
	if matches := re.FindStringSubmatch(target.Password); len(matches) == 2 {
		envName := matches[1]
		if val, ok := os.LookupEnv(envName); ok {
			target.Password = val
		} else {
			target.Password = ""
		}
	}
}
func resolveTektonEnvVars(target *TektonTarget) {
	re := regexp.MustCompile(`\$\{([A-Z0-9_]+)\}`)
	if matches := re.FindStringSubmatch(target.Token); len(matches) == 2 {
		envName := matches[1]
		if val, ok := os.LookupEnv(envName); ok {
			target.Token = val
		} else {
			target.Token = ""
		}
	}
}
func loadConfig(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Config{}, err
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return Config{}, err
	}
	for name, argo := range cfg.ArgoCD {
		resolveEnvVars(&argo)
		cfg.ArgoCD[name] = argo
	}
	for name, tekton := range cfg.Tekton {
		resolveTektonEnvVars(&tekton)
		cfg.Tekton[name] = tekton
	}
	return cfg, nil
}

// --- JWT ---
func GenerateJWT(username string) string {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": username,
		"exp":      time.Now().Add(time.Hour * 1).Unix(),
	})
	tokenString, _ := token.SignedString(jwtSecret)
	return tokenString
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(401, gin.H{"error": "Missing or invalid auth"})
			return
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(401, gin.H{"error": "Invalid token"})
			return
		}
		c.Next()
	}
}

// --- LDAP Login Handler ---
// Artık: Binduser ile bind → kullanıcı search → kullanıcı DN ile bind → JWT
func handleLogin(c *gin.Context) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	// Self-signed CA'yı oku ve güvenli LDAPS bağlantısı oluştur
	roots := x509.NewCertPool()
	caCert, err := os.ReadFile(config.Ldap.CACertPath)
	if err != nil {
		c.JSON(500, gin.H{"error": "CA cert okunamıyor"})
		return
	}
	if !roots.AppendCertsFromPEM(caCert) {
		c.JSON(500, gin.H{"error": "CA cert eklenemedi"})
		return
	}

	// Binduser şifresini ENV'den oku
	bindUserPassword := os.Getenv(config.Ldap.BindUserPasswordEnv)
	if bindUserPassword == "" {
		c.JSON(500, gin.H{"error": "LDAP binduser şifresi bulunamadı"})
		return
	}

	// LDAPS bağlantısı (BindUser ile)
	l, err := ldap.DialURL(config.Ldap.URL, ldap.DialWithTLSConfig(&tls.Config{
		RootCAs: roots,
	}))
	if err != nil {
		c.JSON(500, gin.H{"error": "LDAP connection failed (binduser)"})
		return
	}
	defer l.Close()

	// Binduser ile bind ol
	err = l.Bind(config.Ldap.BindUser, bindUserPassword)
	if err != nil {
		c.JSON(401, gin.H{"error": "LDAP binduser ile bağlantı başarısız"})
		return
	}

	// Kullanıcıyı search et (ör: uid=username, daha esnek filter yazabilirsin)
	searchRequest := ldap.NewSearchRequest(
		config.Ldap.BaseDN,
		ldap.ScopeWholeSubtree, ldap.NeverDerefAliases, 0, 0, false,
		fmt.Sprintf("(&(objectClass=user)(sAMAccountName=%s))", ldap.EscapeFilter(body.Username)),
		[]string{"dn"},
		nil,
	)
	sr, err := l.Search(searchRequest)
	if err != nil || len(sr.Entries) == 0 {
		c.JSON(401, gin.H{"error": "Kullanıcı bulunamadı"})
		return
	}
	userDN := sr.Entries[0].DN

	// Şimdi yeni bir connection ile gerçek kullanıcı şifresiyle bind et
	l2, err := ldap.DialURL(config.Ldap.URL, ldap.DialWithTLSConfig(&tls.Config{
		RootCAs: roots,
	}))
	if err != nil {
		c.JSON(500, gin.H{"error": "LDAP connection failed (user)"})
		return
	}
	defer l2.Close()
	err = l2.Bind(userDN, body.Password)
	if err != nil {
		c.JSON(401, gin.H{"error": "Kullanıcı adı veya şifre hatalı"})
		return
	}

	// Başarılı login → JWT üret
	token := GenerateJWT(body.Username)
	c.JSON(200, gin.H{"token": token})
}

// --- Util ---
func capitalize(s string) string {
	if len(s) == 0 {
		return s
	}
	return string([]rune(s)[0]-32) + s[1:]
}

// Dinamik ortamlar endpointi
func RegisterMetaEndpoints(r *gin.RouterGroup) {
	r.GET("/targets", handleTargets)
}
func handleTargets(c *gin.Context) {
	targets := []map[string]string{}
	for k := range argoTargets {
		var name string
		switch k {
		case "prod":
			name = "ArgoCD Prod"
		case "test":
			name = "ArgoCD Test"
		default:
			name = "ArgoCD " + capitalize(k)
		}
		targets = append(targets, map[string]string{
			"key":  k,
			"name": name,
			"type": "argocd",
		})
	}
	for k := range tektonTargets {
		var name string
		switch k {
		case "prod":
			name = "Tekton Prod"
		case "test":
			name = "Tekton Test"
		default:
			name = "Tekton " + capitalize(k)
		}
		targets = append(targets, map[string]string{
			"key":  k,
			"name": name,
			"type": "tekton",
		})
	}
	c.JSON(200, targets)
}

func main() {
	configPath := flag.String("config", "config.yaml", "Config file path")
	flag.Parse()
	var err error
	config, err = loadConfig(*configPath)
	if err != nil {
		fmt.Println("Config can not be loaded:", err)
		os.Exit(1)
	}
	argoTargets = config.ArgoCD
	tektonTargets = config.Tekton

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     config.Frontend.AllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Login endpoint everyone can access
	r.POST("/api/login", handleLogin)

	// All /api/* endpoints now require JWT Auth
	api := r.Group("/api")
	api.Use(AuthMiddleware())
	{
		RegisterArgoCDEndpoints(api)
		RegisterTektonEndpoints(api)
		RegisterMetaEndpoints(api)
	}

	r.Run(":9090")
}
