const btnConectar = document.getElementById("btnConectar");
const driveLink = document.getElementById("driveLink");

btnConectar.addEventListener("click", () => {
  const link = driveLink.value.trim();

  if (!link) {
    alert("Cole primeiro o link da pasta do Google Drive.");
    return;
  }

  alert("Link recebido. A integração com o Google Drive será adicionada na próxima etapa.");
});