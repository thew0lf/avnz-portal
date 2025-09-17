resource "kubernetes_namespace" "keda" {
  metadata { name = "keda" }
}

resource "helm_release" "keda" {
  name       = "keda"
  repository = "https://kedacore.github.io/charts"
  chart      = "keda"
  namespace  = kubernetes_namespace.keda.metadata[0].name
  version    = "2.14.2"
  values     = []
}

