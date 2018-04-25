# Welcome
This project is intended to serve as a starting point documenting how to setup a Dockerized web application and deploy it to Google Cloud Platform (GCP) using Kubernetes from scratch.

For more information on the key technologies used in this project, please refer to
+ [Docker](https://www.docker.com)
+ [Google Cloud Platform](https://cloud.google.com/)
+ [Kubernetes](https://kubernetes.io)
+ [Node.js](https://nodejs.org/)

This tutorial was heavily inspired by the work covered in [Google Cloud Platform I: Deploy a Docker App To Google Container Engine with Kubernetes](https://scotch.io/tutorials/google-cloud-platform-i-deploy-a-docker-app-to-google-container-engine-with-kubernetes)

# Initial setup
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
Please visit [https://console.cloud.google.com/](https://console.cloud.google.com/) and create a project. For the purposes of this guide, the project name will be `demo-gcp`

Once that has completed, click on the `Products and Services` icon and select `Container Engine`. This is where our Docker images will live. `Container Clusters` manages the nodes of Google Compute Engine instances. `Container Registry` is the repository which will contain all of the Docker images that we will use to create our containers.
 