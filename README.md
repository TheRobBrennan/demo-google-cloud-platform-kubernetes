# Welcome
This project is intended to serve as a starting point documenting how to setup a Dockerized web application and deploy it to Google Cloud Platform (GCP) using Kubernetes from scratch.

If you do not have an account on Google Cloud Platform (GCP), please create one at [https://cloud.google.com](https://cloud.google.com). Currently you can sign up for a free account for one year - and have the ability to run limited Google Cloud Platform services for free once the trial has expired. A credit card is required.

For more information on the key technologies used in this project, please refer to
+ [Docker](https://www.docker.com)
+ [Google Cloud Platform](https://cloud.google.com/)
+ [Kubernetes](https://kubernetes.io)
+ [Node.js](https://nodejs.org/)

This tutorial was heavily inspired by the work covered in [Google Cloud Platform I: Deploy a Docker App To Google Container Engine with Kubernetes](https://scotch.io/tutorials/google-cloud-platform-i-deploy-a-docker-app-to-google-container-engine-with-kubernetes) - and for the sake of completeness some material has been incorporated into this guide.

## What about persistent storage and MySQL?
Those two items are worthy of their own guide. This document will cover the basics of spinning up ephemeral Docker containers on Google Kubernetes Engine.

There is a great [tutorial](https://cloud.google.com/nodejs/docs/tutorials/bookshelf-on-kubernetes-engine) that covers how to set up persistent storage (such as storing images to a bucket on Google Cloud) and using back-end databases (such as the Google Datastore and a Google Cloud instance of MySQL). BE WARNED - the tutorial is 90% helpful, however there were many glaring omissions. Please see my guide `ADVANCED_GCP_KBE.md` for important changes that you will want to make to actually have running code 🙃

## CHEAT SHEET
If you have not set up this project on your development machine, please continue with section `Part 1 - Initial setup`

If you have already set up this environment on your development machine - and you are wanting to deploy a new release of the app - all you will need to do is:

// Build the new version of the app (example project id is `symmetric-rune-202220`) and give it a tag (0.1.1 in this example)

    $ docker build -f ./containers/web/Dockerfile -t gcr.io/symmetric-rune-202220/web:0.1.1 ./containers/web

// Push the new Docker image to the Google Cloud Platform Container Registry

    $ gcloud docker -- push gcr.io/symmetric-rune-202220/web:0.1.1

// In one terminal window, open a proxy to our Kubernetes cluster
$ kubectl proxy

// In a second terminal window, start a rolling update so the `demogcp-web` deployment will use the new image

    $ kubectl set image deployment/demogcp-web demogcp-web=gcr.io/symmetric-rune-202220/web:0.1.1

// Confirm the deployment is a success by watching pods and deployment process

    $ kubectl get pods -w
    $ kubectl get deployments -w

# Part 1 - Initial setup
## Command line
### Docker
If you do not have Docker installed on your machine, please download and install [Docker Community Edition](https://www.docker.com/community-edition) for your development machine.

### Google Cloud SDK
#### Installation
We will need to download and install `gcloud` - the command line tool for managing resources on Google Cloud Platform.

IMPORTANT! Be sure to move the `./google-cloud-sdk` folder to someplace permanent on your development system. I made the mistake of simply running the below commands while the folder was in my `~/Downloads` directory and when I deleted it...the necessary commands no longer existed 😳 If this happened to you, don't sweat it. Put the `./google-cloud-sdk` folder in your home directory, and then modify your `~/.bash_profile` so that it points to the current location (Google Cloud SDK would have appended a few lines at the end of it for you already)

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

NOTE: The tag we use for the image is simply a string. Some possible ways we might consider tagging our `web` image might include:

    gcr.io/symmetric-rune-202220/web:v1
    gcr.io/symmetric-rune-202220/web:0.1.0
    gcr.io/symmetric-rune-202220/web:20180416-hotfix
    gcr.io/symmetric-rune-202220/web:0.1.1build12

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
For the purposes of this guide, we are going to create a deployment named `demogcp-web` and serving the application on port `8000` for project ID `symmetric-rune-202220` using the `web` Docker image tagged as `0.1.0`

To deploy:

    $ kubectl run demogcp-web --image=gcr.io/symmetric-rune-202220/web:0.1.0 --port 8000

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

### Expose application to external traffic
At this point, our deployment is only accessible within the Kubernetes cluster. Pods - like containers - can be destroyed and created at any time.

In order to make our application accessible to the outside world, we need to create a Kubernetes service.

```
A Kubernetes Service is an abstraction which defines a logical set of Pods and a policy by which to access them - sometimes called a micro-service. It enables external traffic exposure, load balancing and service discovery for those Pods.
```

In the following example, we are going to create a `LoadBalancer` service that will accept traffic on port `80` and send it to our target port `8000`

    $ kubectl expose deployment demogcp-web --type=LoadBalancer --port 80 --target-port 8000

To see what services have been defined:

    $ kubectl get services

This will generate output similar to:
```
NAME          TYPE           CLUSTER-IP     EXTERNAL-IP      PORT(S)          AGE
demogcp-dep   NodePort       10.7.254.155   <none>           8000:32265/TCP   16h
demogcp-web   LoadBalancer   10.7.241.179   35.192.140.107   80:32307/TCP     15h
kubernetes    ClusterIP      10.7.240.1     <none>           443/TCP          18h
```


Note: It may take a few minutes for Kubernetes Engine to allocate an external IP address and set up forwarding rules until the load balancer is ready to serve your application. In the meanwhile, you may get errors such as HTTP 404 or HTTP 500 until the load balancer configuration is propagated across the globe.

Based on the above output, our load balanced application is now online and ready to be viewed on our `EXTERNAL-IP` at [http://35.192.140.107](http://35.192.140.107).

To delete a Kubernetes service:

    $ kubectl delete service web-svc

# Part 5 - Rolling updates and scaling
After your initial deployment, you will want to do common operations like:
    + Perform a rolling update of a new image to the app
    + Revert to a previous image if a critical error/flaw is discovered
    + Scale the application
        - Manually scale the container/service
        - Automatically scale the container/service

## Perform a rolling update of a new image to the app
Kubernetes Engine's rolling update mechanism ensures that your application remains up and available even as the system replaces instances of your old container image with your new one across all the running replicas.

If you have already set up this environment on your development machine - and you are wanting to deploy a new release of the app - all you will need to do is:

// Build the new version of the app (example project id is `symmetric-rune-202220`) and give it a tag (`0.1.1` in this example)

    $ docker build -f ./containers/web/Dockerfile -t gcr.io/symmetric-rune-202220/web:0.1.1 ./containers/web

// Push the new Docker image to the Google Cloud Platform Container Registry

    $ gcloud docker -- push gcr.io/symmetric-rune-202220/web:0.1.1

// In one terminal window, open a proxy to our Kubernetes cluster
$ kubectl proxy

// In a second terminal window, start a rolling update so the `demogcp-web` deployment will use the new image

    $ kubectl set image deployment/demogcp-web demogcp-web=gcr.io/symmetric-rune-202220/web:0.1.1

// Confirm the deployment is a success by watching pods and deployment process

    $ kubectl get pods -w
    $ kubectl get deployments -w

## Revert to a previous image if a critical error/flaw is discovered
Uh oh! The latest release of our demo web app has a serious flaw. Time to perform a rolling update so we can rollback to our previous image `demogcp-web=gcr.io/symmetric-rune-202220/web:0.1.0`.

If this image already exists in our Container Registry:

// In one terminal window, open a proxy to our Kubernetes cluster
$ kubectl proxy

// In a second terminal window, start a rolling update so the `demogcp-web` deployment will use the new image

    $ kubectl set image deployment/demogcp-web demogcp-web=gcr.io/symmetric-rune-202220/web:0.1.0

// Confirm the deployment is a success by watching pods and deployment process

    $ kubectl get pods -w
    $ kubectl get deployments -w

If this image does not exist in our Container Registry:
Don't panic. All we need to do is build and tag the appropriate version of our app and then follow the steps above:

// Build the new version of the app (example project id is `symmetric-rune-202220`) and give it a tag (`0.1.0` in this example)

    $ docker build -f ./containers/web/Dockerfile -t gcr.io/symmetric-rune-202220/web:0.1.0 ./containers/web

Now, move up a few lines and follow the instructions in `If this image already exists in our Container Registry`

## Scale the application
The time has come to scale the application up or down. Now what? 

For the purposes of this guide, we will be working on scaling our `demogcp-web` deployment as desired.

### Manually scale the container/service
First thing you'll want to do is get a list of all available deployments (containers/services):

    $ kubectl get deployments

```
NAME          DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
demogcp-web   1         1         1            1           16h
```

Right now we see our `demogcp-web` deployment contains one available node (VM).

To scale our service to three nodes (VMs):

    $ kubectl scale deployment demogcp-web --replicas=3

    We can verify that our scaling is a success by watching the pods and/or deployment:
    
        $ kubectl get pods -w

        ```
        NAME                           READY     STATUS    RESTARTS   AGE
        demogcp-web-6689dcf679-58tj2   1/1       Running   0          12s
        demogcp-web-6689dcf679-lh2j8   1/1       Running   0          12s
        demogcp-web-6689dcf679-xb7dt   1/1       Running   0          16h
        ```

    Our three pods have scaled up as expected - `READY` and with a `STATUS` of `Running`. 
    
    Let's check on the deployment:

        $ kubectl get deployments

        ```
        NAME          DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
        demogcp-web   3         3         3            3           16h
        ```

To scale our service down from three nodes (VMs) to one node (VM):

    $ kubectl scale deployment demogcp-web --replicas=1

    We can verify that our scaling is a success by watching the pods and/or deployment:
    
        $ kubectl get pods -w

        ```
        NAME                           READY     STATUS        RESTARTS   AGE
        demogcp-web-6689dcf679-58tj2   1/1       Terminating   0          16m
        demogcp-web-6689dcf679-lh2j8   1/1       Terminating   0          16m
        demogcp-web-6689dcf679-xb7dt   1/1       Running       0          16h
        ```

    Our three pods have scaled up as expected - one pod exists as `READY` and with a `STATUS` of `Running`; the other two pods have been terminated. 
    
    Let's check on the deployment:

        $ kubectl get deployments

        ```
        NAME          DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
        demogcp-web   1         1         1            1           16h
        ```

### Automatically scale the container/service
Manually scaling the cluster is all well and good, but we can let Kubernetes handle scaling, managing containers, etc for us. 

In this example, we're going to start with a single node (VM) and if CPU utilization is above 75%, we want Kubernetes to create additional nodes (VMs) as desired - up to a limit of ten (10) nodes (VMs).

First thing you'll want to do is get a list of all available deployments (containers/services):

    $ kubectl get deployments

```
NAME          DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
demogcp-web   1         1         1            1           16h
```

Right now we see our `demogcp-web` deployment contains one available node (VM).

To define automatic scaling:

    $ kubectl autoscale deployment nginx-deployment --min=1 --max=10 --cpu-percent=75

Now, our Kubernetes cluster can freely spin up and spin down our nodes as desired. Now we can just sit back, enjoy meetings from some exotic location, and watch the profits roll in. Or maybe not, since this demo app will not light the world on fire. So sad. So sad.

# Next steps
Once you've experimented a bit, I would encourage you to explore these additional resources
[Google Cloud: Deploying a containerized web application](https://cloud.google.com/kubernetes-engine/docs/tutorials/hello-app)
[Google Cloud: Setting up HTTP Load Balancing with Ingress](https://cloud.google.com/kubernetes-engine/docs/tutorials/http-balancer)

This guide was originally created by Rob Brennan <rob@therobbrennan.com>.