# Welcome
This project is intended to serve as a starting point documenting how to setup a Dockerized web application and deploy it to Google Cloud Platform (GCP) using Kubernetes from scratch.

If you do not have an account on Google Cloud Platform (GCP), please create one at [https://cloud.google.com](https://cloud.google.com). Currently you can sign up for a free account for one year - and have the ability to run limited Google Cloud Platform services for free once the trial has expired. A credit card is required.

For more information on the key technologies used in this project, please refer to
+ [Docker](https://www.docker.com)
+ [Google Cloud Platform](https://cloud.google.com/)
+ [Kubernetes](https://kubernetes.io)
+ [Node.js](https://nodejs.org/)

This tutorial was heavily inspired by the work covered in [Google Cloud Platform I: Deploy a Docker App To Google Container Engine with Kubernetes](https://scotch.io/tutorials/google-cloud-platform-i-deploy-a-docker-app-to-google-container-engine-with-kubernetes) - and for the sake of completeness some material has been incorporated into this guide.

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

#### Connect Kubernetes
Now that we have a cluster on Google Cloud Platform that will contain our containerized application, we need to connect our local development environment to the cluster.

##### Obtain credentials from the cluster
Click on the `Connect` button (while viewing the cluster in the `Kubernetes clusters` section). You can copy the command that you need to run from the command line to connect your local development environment to the cluster:

    $ gcloud container clusters get-credentials demogcp-cluster --zone us-central1-a --project symmetric-rune-202220

##### Start proxy server
To start a proxy server to Kubernetes:

    $ kubectl proxy

Once you have run the above command, leave the window open and open a new tab.

# Part 3 - Dockerize the demo application
Our demo application is a simple web server written using express - located at `./containers/web/index.js`

## Create a Docker image
Our Docker image will contain our demo application and all required modules.

To see details of how we are using `Dockerfile` to build our image, please take a look at `./containers/web/Dockerfile`

## Build our Docker image for Google Cloud Platform
In order to create our Google Cloud Platform ready Docker image, we need to follow the naming convention `gcr.io/{$project_id}/{image}:{tag}`

To build our Docker image for the web application:

    $ docker build -f ./containers/web/Dockerfile -t gcr.io/symmetric-rune-202220/web:0.1.0 ./containers/web

We should be able to see our Docker image by running:

    $ docker images
    ```
    REPOSITORY                         TAG                 IMAGE ID            CREATED                  SIZE
    gcr.io/symmetric-rune-202220/web   0.1.0               0105dac33095        Less than a second ago   70.2MB
    node                               9.11.1-alpine       7af437a39ec2        2 weeks ago              68.4MB    
    ```

## Push our Docker image to the Container Registry
To push our image to our Google Cloud Platform Container Registry:

    $ gcloud docker -- push gcr.io/symmetric-rune-202220/web:0.1.0

To verify that the image exists within our repository, please go to the Dashboard and go to `Products & Services > Container Registry > Images`. Notice that the last part of our image tag (above) was `web:0.1.0`. You should see an image named `web` within this view. Click on the `web` image and you will see a list of tagged images - our demo app.

# Part 4 - Instantiate a Docker container
## Kubernetes
At this point, we have a Docker image of our application ready for use. Our next step will be to create a container based upon that image.

We will accomplish this by creating a Kubernetes pod for our container.

```
A Kubernetes pod is a group of containers, tied together for the purposes of administration and networking that are always co-located and co-scheduled, and run in a shared context.
```

Containers within a pod share an IP address and port space, and can find each other via `localhost`

### Deployment
There are two ways to create a deployment using the `kubectl` command. You can either specify the parameters in a `yml` file or the command-line.

Deploying via a `yml` file is the preferred way to go, as you can easily tweak and adjust deployment and scaling in an easy-to-read manner. For the purposes of this demo, though, it will be good to at least acknowledge how you might deploy from the command line if desired.

#### Command line
The deployment name is a unique identifier for your deployment that will be used to reference it later on. Specify the image name to create the deployment from and finally a port which will be mapped to our applications port that is exposed (see `Dockerfile`):

    $ kubectl run {deployment_name} --image=gcr.io/$PROJECT_ID/{name}:{tag} --port={port}

#### YML file
We have defined our deployment configuration in `./deployment.yml`.

To deploy:

    $ kubectl create -f deployment.yml

To view the deployment:

    $ kubectl get deployments
    ** OR **
    $ kubectl get deployments -w

To view the pods:

    $ kubectl get pods
    ** OR **
    $ kubectl get pods -w

To delete a deployment:

    $ kubectl delete deployments/demogcp-dep

