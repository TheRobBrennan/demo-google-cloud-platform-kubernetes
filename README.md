# Welcome
This project is intended to serve as a starting point documenting how to setup a Dockerized web application and deploy it to Google Cloud Platform (GCP) using Kubernetes from scratch.

For more information on the key technologies used in this project, please refer to
+ [Docker](https://www.docker.com)
+ [Google Cloud Platform](https://cloud.google.com/)
+ [Kubernetes](https://kubernetes.io)
+ [Node.js](https://nodejs.org/)

This tutorial was heavily inspired by the work covered in [Google Cloud Platform I: Deploy a Docker App To Google Container Engine with Kubernetes](https://scotch.io/tutorials/google-cloud-platform-i-deploy-a-docker-app-to-google-container-engine-with-kubernetes)

# Part 1 - Initial setup
## Command line
### Docker
If you do not have Docker installed on your machine, please download and install [Docker Community Edition](https://www.docker.com/community-edition) for your development machine.

### Google Cloud SDK
#### Installation
We will need to download and install `gcloud` - the command line tool for managing resources on Google Cloud Platform.

To download and install the latest version of the Google Cloud SDK, please refer to [https://cloud.google.com/sdk/docs/](https://cloud.google.com/sdk/docs/):

    $ ./google-cloud-sdk/install.sh

Once you have installed Google Cloud SDK, be sure that you either start a new shell or refresh your bash profile to have Google Cloud SDK included in your PATH:

    $ source ~/.bash_profile

To verify that you have installed the Google Cloud SDK correctly:

    $ gcloud version
    Google Cloud SDK 199.0.0
    bq 2.0.33
    core 2018.04.20
    gsutil 4.30

#### Connect your account
To authenticate gcloud with your Google account, you must run the initialization command:

    $ gcloud init

This will pop open a browser window for you to login and authenticate your account. You will be prompted to allow Google Cloud SDK to access your account.

Once you see "You are now authenticated with the Google Cloud SDK!" you may close your browser window and return to the terminal.

Follow the prompts to select a default project for `gcloud`. This can be changed later.

#### Verify initial configuration
To verify the initial `gcloud` configuration:

    $ gcloud config list
    [core]
    account = someone@mail.com
    disable_usage_reporting = True

    Your active configuration is: [default]
    
### Kubernetes
The easiest way to install Kubernetes is to install it as part of the Google Cloud SDK:

    $ gcloud components install kubectl

To verify Kubernetes has been installed correctly:

    $ kubectl version

### Wrapping up installation
To see what components have been installed as part of your Google Cloud SDK:

    $ gcloud components list

## Google Cloud Platform
### Create a new project
Please visit [https://console.cloud.google.com/](https://console.cloud.google.com/) and create a project. For the purposes of this guide, the project name will be `demo-gcp` with an automatically generated project ID of `symmetric-rune-202220`

Once that has completed, click on the `Products and Services` icon and select `Container Engine`. This is where our Docker images will live. `Container Clusters` manages the nodes of Google Compute Engine instances. `Container Registry` is the repository which will contain all of the Docker images that we will use to create our containers.

# Part 2 - Configuration
## Google Cloud SDK
### Set the default project
Assuming you have followed the steps as outlined in Part 1, you are now ready to begin configuration of your app.

To set the default project (where `demo-gcp` is the project name):

    $ gcloud config set project demo-gcp

### Clusters
A cluster is a group of Google Compute Engine instances running Kubernetes. Pods and services all run on top of a cluster. Kubernetes coordinates a highly available cluster of computers that are connected to work as a single unit.

#### Create a cluster
To create a new cluster, you can either use the Dashboard by going to `Products & Services > Kubernetes Engine > Kubernetes clusters`. This may take several minutes to initially prepare, but once it has completed click on `Create cluster`.

This guide will assume that you have selected `demogcp-cluster` as the name of the newly created cluster. Use the default values provided by the dashboard. This will create a cluster of three (3) nodes (VM instances).

Before clicking `Create`, note that there are links below to see the equivalent `REST` or `command line` commands. 

In our example, the command you would have needed to supply would have been:

    $ gcloud beta container --project "symmetric-rune-202220" clusters create "demogcp-cluster" --zone "us-central1-a" --username "admin" --cluster-version "1.8.8-gke.0" --machine-type "n1-standard-1" --image-type "COS" --disk-size "100" --scopes "https://www.googleapis.com/auth/compute","https://www.googleapis.com/auth/devstorage.read_only","https://www.googleapis.com/auth/logging.write","https://www.googleapis.com/auth/monitoring","https://www.googleapis.com/auth/servicecontrol","https://www.googleapis.com/auth/service.management.readonly","https://www.googleapis.com/auth/trace.append" --num-nodes "3" --network "default" --enable-cloud-logging --enable-cloud-monitoring --subnetwork "default" --addons HorizontalPodAutoscaling,HttpLoadBalancing,KubernetesDashboard

Be sure to wait for a few moments and occasionally refresh the page. Once you see the green checkmark next to your cluster, you may continue on.
