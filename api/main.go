package main

import (
	"flag"
	"fmt"
	"os"
	"regexp"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v3"
)

type ArgoTarget struct {
	ApiURL   string `yaml:"api_url"`
	Username string `yaml:"username"`
	Password string `yaml:"password"`
}
type TektonTarget struct {
	ApiURL string `yaml:"api_url"`
	Token  string `yaml:"token"`
}
type Config struct {
	ArgoCD map[string]ArgoTarget   `yaml:"argocd"`
	Tekton map[string]TektonTarget `yaml:"tekton"`
}

var argoTargets map[string]ArgoTarget
var tektonTargets map[string]TektonTarget

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
func loadConfig(path string) (map[string]ArgoTarget, map[string]TektonTarget, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, nil, err
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, nil, err
	}
	for name, argo := range cfg.ArgoCD {
		resolveEnvVars(&argo)
		cfg.ArgoCD[name] = argo
	}
	for name, tekton := range cfg.Tekton {
		resolveTektonEnvVars(&tekton)
		cfg.Tekton[name] = tekton
	}
	return cfg.ArgoCD, cfg.Tekton, nil
}

func capitalize(s string) string {
	if len(s) == 0 {
		return s
	}
	return string([]rune(s)[0]-32) + s[1:]
}

// Dinamik ortamlar endpointi
func RegisterMetaEndpoints(r *gin.Engine) {
	r.GET("/api/targets", handleTargets)
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
	argoTargets, tektonTargets, err = loadConfig(*configPath)
	if err != nil {
		fmt.Println("Config can not be loaded:", err)
		os.Exit(1)
	}

	r := gin.Default()
	r.Use(cors.Default())

	RegisterArgoCDEndpoints(r)
	RegisterTektonEndpoints(r)
	RegisterMetaEndpoints(r)

	r.Run(":9090")
}
