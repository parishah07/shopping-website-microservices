provider "google" {
  project = "cloud-devops-shopping-website"
  region  = "us-central1"
}

resource "google_container_cluster" "primary" {
  name     = "shopping-website-cluster"
  location = "us-central1-a"

  initial_node_count = 3

  node_config {
    machine_type = "e2-medium"
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]
  }
}
