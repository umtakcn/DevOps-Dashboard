package main

import (
	"fmt"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// argoTargets global değişkeni argocd.go'da tanımlı olacak

func main() {
	var err error
	argoTargets, err = loadConfig("config.yaml")
	if err != nil {
		fmt.Println("Config yüklenemedi:", err)
		os.Exit(1)
	}

	r := gin.Default()
	r.Use(cors.Default())

	RegisterArgoCDEndpoints(r)
	// İleride:
	// RegisterTektonEndpoints(r)

	r.Run(":9090")
}
