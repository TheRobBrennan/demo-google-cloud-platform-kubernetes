# Tutorial
There is a great [tutorial](https://cloud.google.com/nodejs/docs/tutorials/bookshelf-on-kubernetes-engine) that covers how to set up persistent storage (such as storing images to a bucket on Google Cloud) and using back-end databases (such as the Google Datastore and a Google Cloud instance of MySQL). BE WARNED - the tutorial is 90% helpful, however there were many glaring omissions.

Please refer to this updated guide as you are working through the tutorial. You will save yourself plenty of unexpected headaches.

# Initial setup
+ Created project name `bookshelf2` (project ID `bookshelf2-202417`)
+ Verify Cloud Datastore, Cloud Storage, and Cloud Pub/Sub APIs are enabled (default)
+ Set `gcloud` to default to the new `bookshelf2` project

      $ gcloud config list  // list current configuration
      $ gcloud config set project bookshelf2-202417

+ Create a Cloud SQL MySQL instance
  - Google handles replication, patch management and database management to ensure availability and performance. When you create an instance, choose a size and billing plan to fit your application.
  - DEMO using MySQL 5.7
    + Root password - `va50GxvrK16k2aK1`
    + Instance connection name - `bookshelf2-202417:us-central1:demo-bookshelf2`
  - Create the MySQL user within GCP
  - Connect to our MySQL instance (if a MySQL client is installed locally)
    $ gcloud sql connect demo-bookshelf2 --user=root
  - SSL
    + If you want to access this IP address remotely, create a client certificate to use in your mysql client
    + RECOMMENDED: Only SSL connections to your database server
  - Authorization
    + Add a network (such as an IP for the GenUI office outbound traffic) to be authorized
+ Enable the Cloud SQL Administration API through the Dashboard
+ Create a service account
  - Select the project that contains your Cloud SQL instance
  - Create service account
  - In the Create service account dialog, provide a descriptive name for the service account like `bookshelf2-mysql`
    + For Role, select Cloud SQL > Cloud SQL Client
    + Click Furnish a new private key (as JSON)
    + Click Create and move it to a secure location on your machine
+ Create the proxy user
  - $ gcloud sql instances list
  ```
      NAME             DATABASE_VERSION  LOCATION       TIER              ADDRESS         STATUS
      demo-bookshelf2  MYSQL_5_7         us-central1-c  db-n1-standard-1  35.224.248.113  RUNNABLE
  ```
  - $ gcloud sql users create proxyuser cloudsqlproxy~% --instance=demo-bookshelf2 --password=aPassW3rd4me
  ```
      Creating Cloud SQL user...done.                                                                                                  
      Created user [proxyuser].
  ```
+ Get your instance connection name
  - $ gcloud sql instances describe demo-bookshelf2
  ```
      ...
      bookshelf2-202417:us-central1:demo-bookshelf2
      ...
  ```
+ Create your Secrets
You need two Secrets to enable your Kubernetes Engine application to access the data in your Cloud SQL instance
  - `cloudsql-instance-credentials` - Secret contains the service account
    + Create the cloudsql-instance-credentials Secret, using the key file you downloaded previously

      $ kubectl create secret generic cloudsql-instance-credentials --from-file=credentials.json=/Users/rob/Downloads/bookshelf2-ca1a0a4381fd.json

  - `cloudsql-db-credentials` - Secret provides the proxy user account and password
    + Create the cloudsql-db-credentials Secret, using the name and password for the proxy user you created previously

      $ kubectl create secret generic cloudsql-db-credentials --from-literal=username=proxyuser --from-literal=password=aPassW3rd4me

+ Create the Kubernetes Engine API - This may take a few minutes to complete
+ Open up an additional terminal window to fire up the Kubernetes proxy - `kubectl proxy`
+ Create the Kubernetes cluster
  - To create a new cluster, you can either use the Dashboard by going to `Products & Services > Kubernetes Engine > Kubernetes clusters`.
        $ gcloud container clusters create bookshelf \
            --scopes "cloud-platform" \
            --num-nodes 2 \
            --zone us-west1-a

        $ gcloud beta container --project "bookshelf2-202417" clusters create "bookshelf2" --zone "us-central1-a" --username "admin" --cluster-version "1.8.8-gke.0" --machine-type "n1-standard-1" --image-type "COS" --disk-size "100" --scopes "https://www.googleapis.com/auth/compute","https://www.googleapis.com/auth/devstorage.read_only","https://www.googleapis.com/auth/logging.write","https://www.googleapis.com/auth/monitoring","https://www.googleapis.com/auth/servicecontrol","https://www.googleapis.com/auth/service.management.readonly","https://www.googleapis.com/auth/trace.append" --num-nodes "3" --network "default" --enable-cloud-logging --enable-cloud-monitoring --subnetwork "default" --addons HorizontalPodAutoscaling,HttpLoadBalancing,KubernetesDashboard
  
  This may take several minutes to initially prepare, but once it has completed click on `Create cluster`. This will fire up the Kubernetes engine.

  ```
  Creating cluster bookshelf2...done.                                                                                              
  Created [https://container.googleapis.com/v1/projects/bookshelf2-202417/zones/us-central1-a/clusters/bookshelf2].
  To inspect the contents of your cluster, go to: https://console.cloud.google.com/kubernetes/workload_/gcloud/us-central1-a/bookshelf2?project=bookshelf2-202417
  kubeconfig entry generated for bookshelf2.
  NAME        LOCATION       MASTER_VERSION  MASTER_IP      MACHINE_TYPE   NODE_VERSION  NUM_NODES  STATUS
  bookshelf2  us-central1-a  1.8.8-gke.0     35.194.18.130  n1-standard-1  1.8.8-gke.0   3          RUNNING
  ```

  - Verify cluster is online - `kubectl get nodes`
  ```
  NAME                                        STATUS    ROLES     AGE       VERSION
  gke-bookshelf2-default-pool-df4d30e4-8c75   Ready     <none>    1m        v1.8.8-gke.0
  gke-bookshelf2-default-pool-df4d30e4-kv61   Ready     <none>    2m        v1.8.8-gke.0
  gke-bookshelf2-default-pool-df4d30e4-rzt7   Ready     <none>    2m        v1.8.8-gke.0
  ```
  - Create an entity in the Google Cloud Datastore. This will take about a minute or so to complete.
  - Create a Cloud Storage Bucket to store our image files

        // Create the bucket to store our image files
        $ gsutil mb gs://bookshelf2-202417

        // Set the bucket's default ACL to be readable by the public so users can view their images
        $ gsutil defacl set public-read gs://bookshelf2-202417

  - Create `./optional-kubernetes-engine/config.json`
  - Modify `./optional-kubernetes-engine/config.js` with Cloud SQL settings
  - Review `Dockerfile` and `.dockerignore`

# Build the application
+ Build the application image 
      
      $ cd optional-kubernetes-engine/
      $ docker build -t gcr.io/bookshelf2-202417/bookshelf .

+ Push the image to the Google Container Registry

      $ gcloud docker -- push gcr.io/bookshelf2-202417/bookshelf

# Deploy the bookshelf front-end
+ Modify `./optional-kubernetes-engine/bookshelf-frontend-datastore.yaml`
+ Use `kubectl` to deploy the resources to the cluster

      $ kubectl create -f bookshelf-frontend-datastore.yaml
            ** OR for MySQL **
      $ kubectl create -f bookshelf-frontend-cloudsql.yaml
      $ kubectl replace --force -f bookshelf-frontend-cloudsql.yaml

      // OPTIONAL
      $ kubectl get deployments
      $ kubectl get pods
      // Problems? Delete the deployment
      $ kubectl delete deployments bookshelf-frontend
      // Delete and replace pods
      $ kubectl replace --force -f bookshelf-frontend-datastore.yaml

```
// ./optional-kubernetes-engine/bookshelf-frontend-datastore.yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: bookshelf-frontend
  labels:
    app: bookshelf
# The bookshelf frontend replica set ensures that at least 3 instances of the bookshelf app are running on the cluster.
# For more info about Pods see:
#   https://cloud.google.com/container-engine/docs/pods/
spec:
  replicas: 2
  template:
    metadata:
      labels:
        app: bookshelf
        tier: frontend
    spec:
      containers:
      - name: bookshelf-app
        # Replace bookshelf2-202417 with your project ID or use `make template`.
        image: gcr.io/bookshelf2-202417/bookshelf
        # This setting makes nodes pull the docker image every time before starting the pod. This is useful when debugging, but should be turned off in production.
        imagePullPolicy: Always
        # The bookshelf process listens on port 8080 for web traffic by default.
        ports:
        - name: http-server
          containerPort: 8080
        env:
          - name: GOOGLE_APPLICATION_CREDENTIALS
            value: /var/run/secret/cloud.google.com/secrets-key.json
          - name: PROJECT_ID
            value: bookshelf2-202417
          - name: MYSQL_USER
            valueFrom:
              secretKeyRef:
                name: cloudsql-db-credentials
                key: username
          - name: MYSQL_PASSWORD
            valueFrom:
              secretKeyRef:
                name: cloudsql-db-credentials
                key: password
          - name: MYSQL_HOST
            value: "127.0.0.1"
          - name: SQL_PORT
            value: "3306"
      - name: cloudsql-proxy
        image: gcr.io/cloudsql-docker/gce-proxy:1.11
        # Change [INSTANCE_CONNECTION_NAME] to include your GCP
        # project, the region of your Cloud SQL instance and the name
        # of your Cloud SQL instance. The format is
        # $PROJECT:$REGION:$INSTANCE
        command: ["/cloud_sql_proxy",
                  "-instances=bookshelf2-202417:us-central1:demo-bookshelf2=tcp:3306",
                  "-credential_file=/secrets/cloudsql/credentials.json"]
        volumeMounts:
          - name: cloudsql-instance-credentials
            mountPath: /secrets/cloudsql
            readOnly: true

      volumes:
        - name: cloudsql-instance-credentials
          secret:
            secretName: cloudsql-instance-credentials
```

# Deploy the bookshelf back-end
+ Modify `./optional-kubernetes-engine/bookshelf-worker-datastore.yaml`
+ Use `kubectl` to deploy the resources to the cluster

      $ kubectl create -f bookshelf-worker-datastore.yaml
            ** OR for MySQL **
      $ kubectl create -f bookshelf-worker-cloudsql.yaml
      $ kubectl replace --force -f bookshelf-worker-cloudsql.yaml

      // OPTIONAL
      $ kubectl get deployments
      $ kubectl get pods
      // Problems? Delete the deployment
      $ kubectl delete deployments bookshelf-worker
      // Logs
      $ kubectl logs bookshelf-worker-7f8488bfc6-hfhz2 -c bookshelf-app
      // What's happening inside a specific pod?
      $ kubectl describe pod bookshelf-worker-7f8488bfc6-hfhz2

```
// ./optional-kubernetes-engine/bookshelf-frontend-datastore.yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: bookshelf-worker
  labels:
    app: bookshelf
# The bookshelf worker replica set ensures that at least 2 instances of the bookshelf worker pod are running on the cluster.
# For more info about Pods see:
#   https://cloud.google.com/container-engine/docs/pods/
spec:
  replicas: 2
  template:
    metadata:
      labels:
        app: bookshelf
        tier: worker
    spec:
      containers:
      - name: bookshelf-app
        # Replace bookshelf2-202417 with your project ID or use `make template`.
        image: gcr.io/bookshelf2-202417/bookshelf
        # This setting makes nodes pull the docker image every time before starting the pod. This is useful when debugging, but should be turned off in production.
        imagePullPolicy: Always
        # The SCRIPT environment variable is used by `npm start` to control
        # which script is executed. This tells npm start to use `worker.js`
        # instead of the default `app.js`.
        env:
        - name: SCRIPT
          value: worker.js
        - name: GOOGLE_APPLICATION_CREDENTIALS
          value: /var/run/secret/cloud.google.com/secrets-key.json
        - name: PROJECT_ID
          value: bookshelf2-202417
        - name: MYSQL_USER
          valueFrom:
            secretKeyRef:
              name: cloudsql-db-credentials
              key: username
        - name: MYSQL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: cloudsql-db-credentials
              key: password
        - name: MYSQL_HOST
          value: "127.0.0.1"
        - name: SQL_PORT
          value: "3306"
      - name: cloudsql-proxy
        image: gcr.io/cloudsql-docker/gce-proxy:1.11
        # Change [INSTANCE_CONNECTION_NAME] to include your GCP
        # project, the region of your Cloud SQL instance and the name
        # of your Cloud SQL instance. The format is
        # $PROJECT:$REGION:$INSTANCE
        command: ["/cloud_sql_proxy",
                  "-instances=bookshelf2-202417:us-central1:demo-bookshelf2=tcp:3306",
                  "-credential_file=/secrets/cloudsql/credentials.json"]
        volumeMounts:
          - name: cloudsql-instance-credentials
            mountPath: /secrets/cloudsql
            readOnly: true

      volumes:
        - name: cloudsql-instance-credentials
          secret:
            secretName: cloudsql-instance-credentials
```

# Create the bookshelf service
Kubernetes Services are used to provide a single point of access to a set of pods. While it's possible to access a single pod, pods are ephemeral and it's usually more convenient to address a set of pods with a single endpoint.

+ Review `optional-kubernetes-engine/bookshelf-service.yaml`

Notice that the pods and the service that uses the pods are separate. Kubernetes uses labels to select the pods that a service addresses. With labels, you can have a service that addresses pods from different replica sets and have multiple services that point to an individual pod.

+ Create the service using `kubectl`

      $ kubectl create -f bookshelf-service.yaml

+ Get the service's external IP address

      $ kubectl get services
      // OPTIONAL
      $ kubectl delete service bookshelf-frontend

```
NAME                 TYPE           CLUSTER-IP     EXTERNAL-IP     PORT(S)        AGE
bookshelf-frontend   LoadBalancer   10.63.240.95   35.197.127.20   80:30708/TCP   1m
kubernetes           ClusterIP      10.63.240.1    <none>          443/TCP        59m
```

In this example, our `EXTERNAL-IP` we need to visit is at [http://35.197.127.20](http://35.197.127.20)

Note that it may take up to 60 seconds for the IP address to be allocated. The external IP address will be listed under `LoadBalancer Ingress`

# Deleting or removing the project
When you're ready to remove the project entirely, please follow the steps below.

+ Go to the Projects page and delete the project
+ Delete the Kubernetes cluster

      $ gcloud container clusters delete bookshelf --zone us-west1-a

Deleting the cluster removes all Kubernetes Engine and Compute Engine resources, but you need to manually remove any resources in Cloud Storage, Cloud Datastore, and Cloud Pub/Sub.

# Conclusion
That's it!!!
