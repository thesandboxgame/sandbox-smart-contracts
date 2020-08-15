#!/usr/bin/env groovy
//=====================
// DEFINE ALL VARIABLES
//=====================


pipeline {
    agent any

    options {
        timestamps()
    }

    stages {

        stage ('Checkout') {
            steps {
                sh "git clean -fdx" // Clean the workspace
                checkout scm // Checkout code
            }
        }

        stage ('Test') {
            steps {
                sh "docker build -t test-private-contracts ." 
                
            }
        }      
             
        
                   
    }

}

  
