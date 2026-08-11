const btnConectar = document.getElementById("btnConectar");
const driveLink = document.getElementById("driveLink");

const progresso = document.getElementById("progresso");
const analisadas = document.getElementById("analisadas");
const restantes = document.getElementById("restantes");
const finalistas = document.getElementById("finalistas");

// COLE SUA CHAVE DA GOOGLE DRIVE API AQUI
const API_KEY = AIzaSyD_jxJznvmnnRpBXNVMlXj0SGKoN9zBC1g ;

function extrairIdPasta(link) {
  const match = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);

  if (!match) {
    return null;
  }

  return match[1];
}

async function buscarFotosDaPasta(folderId) {
  let fotos = [];
  let pageToken = "";

  do {
    const query = encodeURIComponent(
      `'${folderId}' in parents and trashed = false`
    );

    let url =
      `https://www.googleapis.com/drive/v3/files` +
      `?q=${query}` +
      `&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,webViewLink,size)` +
      `&pageSize=1000` +
      `&key=${API_KEY}`;

    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    const resposta = await fetch(url);

    if (!resposta.ok) {
      const erro = await resposta.json();
      console.error(erro);
      throw new Error(
        erro?.error?.message || "Erro ao acessar o Google Drive."
      );
    }

    const dados = await resposta.json();

    const imagens = (dados.files || []).filter((arquivo) =>
      arquivo.mimeType?.startsWith("image/")
    );

    fotos = fotos.concat(imagens);

    pageToken = dados.nextPageToken || "";
  } while (pageToken);

  return fotos;
}

btnConectar.addEventListener("click", async () => {
  const link = driveLink.value.trim();

  if (!link) {
    alert("Cole primeiro o link público da pasta do Google Drive.");
    return;
  }

  const folderId = extrairIdPasta(link);

  if (!folderId) {
    alert("Não consegui identificar o ID dessa pasta.");
    return;
  }

  btnConectar.disabled = true;
  btnConectar.textContent = "Conectando...";

  progresso.textContent = "Buscando fotografias...";
  analisadas.textContent = "0";
  restantes.textContent = "0";
  finalistas.textContent = "0";

  try {
    const fotos = await buscarFotosDaPasta(folderId);

    if (fotos.length === 0) {
      progresso.textContent = "Nenhuma fotografia encontrada.";
      return;
    }

    progresso.textContent = `0 / ${fotos.length} fotos`;

    analisadas.textContent = "0";
    restantes.textContent = fotos.length;
    finalistas.textContent = "0";

    console.log("FOTOS ENCONTRADAS:");
    console.table(fotos);

    alert(
      `Pasta conectada com sucesso!\n\n${fotos.length} fotografias encontradas.`
    );

  } catch (erro) {
    console.error(erro);

    progresso.textContent = "Erro ao acessar a pasta.";

    alert(
      "Não foi possível acessar a pasta.\n\n" +
      erro.message
    );
  } finally {
    btnConectar.disabled = false;
    btnConectar.textContent = "Conectar pasta";
  }
});