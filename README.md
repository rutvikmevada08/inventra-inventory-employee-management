# Deep Eigen Code Base

### Introduction

Welcome to the Deepeigen documentation! This guide will help you understand and set up the Deepeigen online learning platform.
Deepeigen is an online learning platform focusing on Artificial Intelligence and Machine Learning. Our platform offers a diverse range of courses, including computer vision and reinforcement learning, with a commitment to delivering high-quality education at an affordable price.

## Getting Started


### Clone the Repository:
```bash
git clone https://github.com/DeepEigen/MainCodeBase.git
```
### Install Dependencies:
 1. Install virtual environment:
      activate with :
 ```bash 
source env/bin/activate 
```
2. Python > 3.7
3. Django > 3.2.7
4. Install other dependencies with from requirements.txt
```bash
pip install -r requirements.txt
```
## PostgreSQL Setup
### Installation : 
1. Install PostgreSQL. Refer to the following links for installation guides:  
     [DigitalOcean PostgreSQL Installation Guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-22-04)  
[Alternative Installation Guide (if needed)](https://www.cherryservers.com/blog/how-to-install-and-setup-postgresql-server-on-ubuntu-20-04)
2. Use pgAdmin for a graphical interface (If needed).

## Setting and Starting the Server
### Make necessary changes: 
Before starting the server, make necessary changes in the deepeigen/settings.py file.  
 1. Search for database section in the file.
2. Comment the HOST line and add HOST as localhost. 
3. Comment the USER,NAME(which is the db name) and password according to your postgres setup.
### Start the Server: 
```bash
python manage.py runserver
``` 
If this don't work write python with its virsion (eg. python3 ) 
``` bash 
python3 manage.py runserver
```
### Apply migrations if needed: 
```bash
python manage.py migrate
```
Access the application in your browser at http://localhost:8000.
#### To run the server on a different port:
```bash
python manage.py runserver 7000
```

#### For LAN access:
```bash
python manage.py runserver 0.0.0.0:7000
```
Access the application on other machines using the server machine's IPv4, for example, http://192.168.1.11:7000


