pipeline {
  agent any

  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
  }

  parameters {
    string(name: 'REGISTRY', defaultValue: '', description: 'Container registry (e.g., ghcr.io, docker.io)')
    string(name: 'REGISTRY_NAMESPACE', defaultValue: '', description: 'Registry namespace/org (optional)')
    choice(name: 'ENV', choices: ['dev', 'staging', 'prod'], description: 'Target environment')
    string(name: 'COMPOSE_FILE', defaultValue: 'ci/docker-compose.ci.yml', description: 'Compose file for deploys')
  }

  environment {
    REGISTRY = "${params.REGISTRY}"
    REGISTRY_NAMESPACE = "${params.REGISTRY_NAMESPACE}"
    COMPOSE_FILE = "${params.COMPOSE_FILE}"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Prepare') {
      steps {
        sh 'echo Using registry: ${REGISTRY}/${REGISTRY_NAMESPACE}'
        sh 'ci/scripts/discover.sh || true'
      }
    }

    stage('Install and Test') {
      steps {
        sh 'ci/scripts/test.sh'
      }
    }

    stage('Build Images') {
      steps {
        sh 'GIT_SHA=$(git rev-parse --short HEAD) ci/scripts/build.sh'
      }
    }

    stage('Security Scan') {
      steps {
        sh 'ci/scripts/scan.sh'
      }
    }

    stage('Push Images') {
      when { expression { return params.REGISTRY?.trim() } }
      steps {
        sh 'GIT_SHA=$(git rev-parse --short HEAD) ci/scripts/push.sh'
      }
    }

    stage('Deploy') {
      when { anyOf { expression { return params.ENV == 'dev' }; expression { return params.ENV == 'staging' }; expression { return params.ENV == 'prod' } } }
      steps {
        sh 'GIT_SHA=$(git rev-parse --short HEAD) ci/scripts/deploy.sh'
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'ci/**/*.yml', allowEmptyArchive: true
    }
  }
}
