resource "kubernetes_namespace" "argocd" {
  metadata { name = "argocd" }
}

resource "helm_release" "argocd" {
  name       = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  namespace  = kubernetes_namespace.argocd.metadata[0].name
  version    = "5.51.5"

  values = [
    yamlencode({
      server = {
        service = { type = "LoadBalancer" }
        extraArgs = ["--insecure"]
      }
    })
  ]
}

# Optional: AWS Load Balancer Controller (for Ingress support)
resource "kubernetes_namespace" "alb" { metadata { name = "kube-system" } }

resource "helm_release" "aws_load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "1.7.2"
  depends_on = [aws_eks_cluster.this]
  values = [
    yamlencode({
      clusterName = aws_eks_cluster.this.name,
      region      = var.region,
      vpcId       = aws_vpc.main.id
    })
  ]
}

