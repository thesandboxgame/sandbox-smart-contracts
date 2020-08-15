#!/usr/bin/env groovy
//=====================
// DEFINE ALL VARIABLES
//=====================


pipeline {
    agent any

    options {
        timestamps()
    }
    environment {

    }
    stages {

        stage ('Checkout') {
            steps {
                sh "git clean -fdx" // Clean the workspace
                checkout scm // Checkout code
            }
        }

        stage ('Install packages') {
            steps {
                sh "yarn" 
                
            }
        }      

        stage ('Test') {
            steps {
                sh "yarn test" 
                
            }
        }                
        
                   
    }

}

  
