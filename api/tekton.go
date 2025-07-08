package main

import (
	"crypto/tls"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterTektonEndpoints(r *gin.Engine) {
	r.GET("/api/tekton/pipelineruns", handleTektonPipelineRuns)
	r.GET("/api/tekton/pipelineruns/:name", handleTektonPipelineRunDetail)
	r.GET("/api/tekton/taskruns", handleTektonTaskRuns)
}

func getTektonTarget(c *gin.Context) TektonTarget {
	target := c.DefaultQuery("target", "prod")
	if t, ok := tektonTargets[target]; ok {
		return t
	}

	return tektonTargets["prod"]
}

func handleTektonPipelineRuns(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "tekton")
	tgt := getTektonTarget(c)
	url := fmt.Sprintf("%s/apis/tekton.dev/v1beta1/namespaces/%s/pipelineruns", tgt.ApiURL, namespace)

	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+tgt.Token)
	req.Header.Set("Accept", "application/json")

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{Transport: tr}

	resp, err := client.Do(req)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		c.JSON(resp.StatusCode, gin.H{"error": string(body)})
		return
	}

	c.Data(200, "application/json", body)
}

func handleTektonPipelineRunDetail(c *gin.Context) {
	name := c.Param("name")
	namespace := c.DefaultQuery("namespace", "tekton")
	tgt := getTektonTarget(c)
	url := fmt.Sprintf("%s/apis/tekton.dev/v1beta1/namespaces/%s/pipelineruns/%s", tgt.ApiURL, namespace, name)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+tgt.Token)
	req.Header.Set("Accept", "application/json")
	tr := &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	client := &http.Client{Transport: tr}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		c.JSON(resp.StatusCode, gin.H{"error": string(body)})
		return
	}
	c.Data(200, "application/json", body)
}

func handleTektonTaskRuns(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "tekton")
	pipelineRunName := c.Query("pipelineRunName")
	tgt := getTektonTarget(c)
	url := fmt.Sprintf("%s/apis/tekton.dev/v1beta1/namespaces/%s/taskruns?labelSelector=tekton.dev/pipelineRun%%3D%s", tgt.ApiURL, namespace, pipelineRunName)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+tgt.Token)
	req.Header.Set("Accept", "application/json")
	tr := &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	client := &http.Client{Transport: tr}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		c.JSON(resp.StatusCode, gin.H{"error": string(body)})
		return
	}
	c.Data(200, "application/json", body)
}
