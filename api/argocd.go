package main

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/gin-gonic/gin"
)

type LoginResponse struct {
	Token string `json:"token"`
}

type AppSummary struct {
	Name                string `json:"name"`
	AppNamespace        string `json:"appNamespace"`
	DeploymentName      string `json:"deploymentName"`
	DeploymentNamespace string `json:"deploymentNamespace"`
	Health              string `json:"health"`
	Project             string `json:"project"`
}

func RegisterArgoCDEndpoints(r *gin.Engine) {
	r.GET("/api/apps", handleApps)
	r.POST("/api/restart", handleRestart)
	r.POST("/api/sync", handleSync)
}

func handleApps(c *gin.Context) {
	target := c.Query("target")
	if target == "" {
		target = "prod"
	}
	argo, ok := argoTargets[target]
	if !ok {
		c.JSON(400, gin.H{"error": "Target ArgoCD undefined"})
		return
	}

	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}

	loginBody := map[string]string{
		"username": argo.Username,
		"password": argo.Password,
	}
	jsonBody, _ := json.Marshal(loginBody)
	loginReq, _ := http.NewRequest("POST", argo.ApiURL+"/api/v1/session", bytes.NewBuffer(jsonBody))
	loginReq.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(loginReq)
	if err != nil {
		fmt.Println("Login request error:", err)
		c.JSON(500, gin.H{"error": "Login error"})
		return
	}
	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		c.JSON(401, gin.H{"error": "Login failed", "detail": string(body)})
		return
	}
	var loginResp LoginResponse
	json.Unmarshal(body, &loginResp)

	appsReq, _ := http.NewRequest("GET", argo.ApiURL+"/api/v1/applications", nil)
	appsReq.Header.Set("Authorization", "Bearer "+loginResp.Token)
	appsResp, err := client.Do(appsReq)
	if err != nil {
		c.JSON(500, gin.H{"error": "App list can not be fetched"})
		return
	}
	defer appsResp.Body.Close()
	appsBody, _ := ioutil.ReadAll(appsResp.Body)

	var data struct {
		Items []struct {
			Metadata struct {
				Name      string `json:"name"`
				Namespace string `json:"namespace"`
			} `json:"metadata"`
			Status struct {
				Health struct {
					Status string `json:"status"`
				} `json:"health"`
			} `json:"status"`
		} `json:"items"`
	}
	json.Unmarshal(appsBody, &data)

	var result []AppSummary
	for _, item := range data.Items {
		appReq, _ := http.NewRequest("GET", argo.ApiURL+"/api/v1/applications/"+item.Metadata.Name, nil)
		appReq.Header.Set("Authorization", "Bearer "+loginResp.Token)
		appResp, err := client.Do(appReq)
		if err != nil {
			continue
		}
		defer appResp.Body.Close()
		appRespBody, _ := ioutil.ReadAll(appResp.Body)
		var appData struct {
			Spec struct {
				Project string `json:"project"`
			} `json:"spec"`
			Status struct {
				Resources []struct {
					Kind      string `json:"kind"`
					Name      string `json:"name"`
					Namespace string `json:"namespace"`
				} `json:"resources"`
			} `json:"status"`
		}
		json.Unmarshal(appRespBody, &appData)

		var deploymentName, deploymentNamespace string
		for _, res := range appData.Status.Resources {
			if res.Kind == "Deployment" {
				deploymentName = res.Name
				deploymentNamespace = res.Namespace
				break
			}
		}

		result = append(result, AppSummary{
			Name:                item.Metadata.Name,
			AppNamespace:        item.Metadata.Namespace,
			DeploymentName:      deploymentName,
			DeploymentNamespace: deploymentNamespace,
			Health:              item.Status.Health.Status,
			Project:             appData.Spec.Project,
		})
	}

	c.JSON(200, result)
}

func handleRestart(c *gin.Context) {
	var req struct {
		AppName             string `json:"appName"`
		DeploymentName      string `json:"deploymentName"`
		DeploymentNamespace string `json:"deploymentNamespace"`
		Target              string `json:"target"`
	}
	body, _ := ioutil.ReadAll(c.Request.Body)
	if err := json.Unmarshal(body, &req); err != nil {
		fmt.Println("JSON decode error (restart):", err)
		c.JSON(400, gin.H{"error": "Request invalid (not decoded)"})
		return
	}
	argo, ok := argoTargets[req.Target]
	if !ok {
		c.JSON(400, gin.H{"error": "Target ArgoCD undefined"})
		return
	}

	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}
	loginBody := map[string]string{
		"username": argo.Username,
		"password": argo.Password,
	}
	jsonBody, _ := json.Marshal(loginBody)
	loginReq, _ := http.NewRequest("POST", argo.ApiURL+"/api/v1/session", bytes.NewBuffer(jsonBody))
	loginReq.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(loginReq)
	if err != nil {
		fmt.Println("Login request error (restart):", err)
		c.JSON(500, gin.H{"error": "Login error"})
		return
	}
	defer resp.Body.Close()
	loginRespBody, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		c.JSON(401, gin.H{"error": "Login failed", "detail": string(loginRespBody)})
		return
	}
	var loginResp LoginResponse
	json.Unmarshal(loginRespBody, &loginResp)

	url := fmt.Sprintf(
		"%s/api/v1/applications/%s/resource/actions?namespace=%s&resourceName=%s&version=v1&group=apps&kind=Deployment",
		argo.ApiURL, req.AppName, req.DeploymentNamespace, req.DeploymentName,
	)
	actionBody := []byte(`"restart"`)

	actionReq, _ := http.NewRequest("POST", url, bytes.NewBuffer(actionBody))
	actionReq.Header.Set("Authorization", "Bearer "+loginResp.Token)
	actionReq.Header.Set("Content-Type", "application/json")

	actionResp, err := client.Do(actionReq)
	if err != nil {
		fmt.Println("Restart API error:", err)
		c.JSON(500, gin.H{"error": "Restart API error"})
		return
	}
	defer actionResp.Body.Close()
	actionRespBody, _ := ioutil.ReadAll(actionResp.Body)
	if actionResp.StatusCode != 200 {
		fmt.Println("Restart response:", string(actionRespBody))
		c.JSON(actionResp.StatusCode, gin.H{"error": "Restart failed", "detail": string(actionRespBody)})
		return
	}

	c.JSON(200, gin.H{"result": "Restarted", "deployment": req.DeploymentName})
}

func handleSync(c *gin.Context) {
	var req struct {
		AppName string `json:"appName"`
		Target  string `json:"target"`
	}
	body, _ := ioutil.ReadAll(c.Request.Body)
	if err := json.Unmarshal(body, &req); err != nil {
		fmt.Println("JSON decode error (sync):", err)
		c.JSON(400, gin.H{"error": "Request invalid (not decoded)"})
		return
	}
	argo, ok := argoTargets[req.Target]
	if !ok {
		c.JSON(400, gin.H{"error": "Target ArgoCD undefined"})
		return
	}

	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}
	loginBody := map[string]string{
		"username": argo.Username,
		"password": argo.Password,
	}
	jsonBody, _ := json.Marshal(loginBody)
	loginReq, _ := http.NewRequest("POST", argo.ApiURL+"/api/v1/session", bytes.NewBuffer(jsonBody))
	loginReq.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(loginReq)
	if err != nil {
		fmt.Println("Login request error (sync):", err)
		c.JSON(500, gin.H{"error": "Login error"})
		return
	}
	defer resp.Body.Close()
	loginRespBody, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		c.JSON(401, gin.H{"error": "Login failed", "detail": string(loginRespBody)})
		return
	}
	var loginResp LoginResponse
	json.Unmarshal(loginRespBody, &loginResp)

	url := fmt.Sprintf("%s/api/v1/applications/%s/sync", argo.ApiURL, req.AppName)
	syncBody := []byte(`{}`)

	syncReq, _ := http.NewRequest("POST", url, bytes.NewBuffer(syncBody))
	syncReq.Header.Set("Authorization", "Bearer "+loginResp.Token)
	syncReq.Header.Set("Content-Type", "application/json")

	syncResp, err := client.Do(syncReq)
	if err != nil {
		fmt.Println("Sync API error:", err)
		c.JSON(500, gin.H{"error": "Sync API error"})
		return
	}
	defer syncResp.Body.Close()
	syncRespBody, _ := ioutil.ReadAll(syncResp.Body)
	if syncResp.StatusCode != 200 {
		fmt.Println("Sync response:", string(syncRespBody))
		c.JSON(syncResp.StatusCode, gin.H{"error": "Sync failed", "detail": string(syncRespBody)})
		return
	}

	c.JSON(200, gin.H{"result": "Synced", "app": req.AppName})
}
