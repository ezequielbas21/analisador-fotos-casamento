const btnConectar = document.getElementById("btnConectar");
const btnIniciar = document.getElementById("btnIniciar");
const btnPausar = document.getElementById("btnPausar");
const btnCarregarMais = document.getElementById("btnCarregarMais");

const driveLink = document.getElementById("driveLink");

const progresso = document.getElementById("progresso");
const porcentagem = document.getElementById("porcentagem");
const barra = document.getElementById("barra");

const totalFotos = document.getElementById("totalFotos");
const analisadas = document.getElementById("analisadas");
const restantes = document.getElementById("restantes");
const finalistas = document.getElementById("finalistas");

const statusPasta = document.getElementById("statusPasta");
const infoGaleria = document.getElementById("infoGaleria");
const galeria = document.getElementById("galeria");


// COLE SUA CHAVE ENTRE AS ASPAS
const API_KEY = "AIzaSyAPl2tgM9c07P0FtM9saMMvWa8vi_rzR08";


let todasAsFotos = [];

let quantidadeExibida = 0;

const FOTOS_POR_PAGINA = 24;



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
      `&fields=nextPageToken,files(id,name,mimeType,webViewLink,size)` +
      `&pageSize=1000` +
      `&orderBy=name` +
      `&key=${API_KEY}`;


    if (pageToken) {

      url += `&pageToken=${encodeURIComponent(pageToken)}`;

    }


    const resposta = await fetch(url);


    if (!resposta.ok) {

      const erro = await resposta.json();

      console.error(erro);

      throw new Error(
        erro?.error?.message ||
        "Erro ao acessar o Google Drive."
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



function criarUrlMiniatura(id) {

  return `https://drive.google.com/thumbnail?id=${id}&sz=w500`;

}



function mostrarMaisFotos() {

  const inicio = quantidadeExibida;

  const fim = Math.min(
    quantidadeExibida + FOTOS_POR_PAGINA,
    todasAsFotos.length
  );


  for (let i = inicio; i < fim; i++) {

    const foto = todasAsFotos[i];


    const card = document.createElement("div");

    card.className = "foto-card";


    const imagem = document.createElement("img");

    imagem.src = criarUrlMiniatura(foto.id);

    imagem.alt = foto.name;

    imagem.loading = "lazy";


    imagem.onerror = () => {

      imagem.style.opacity = "0.25";

    };


    const info = document.createElement("div");

    info.className = "foto-info";


    const nome = document.createElement("div");

    nome.className = "foto-nome";

    nome.textContent = foto.name;


    const numero = document.createElement("div");

    numero.className = "foto-numero";

    numero.textContent =
      `Foto ${i + 1} de ${todasAsFotos.length}`;


    info.appendChild(nome);

    info.appendChild(numero);


    card.appendChild(imagem);

    card.appendChild(info);


    galeria.appendChild(card);

  }


  quantidadeExibida = fim;


  if (quantidadeExibida < todasAsFotos.length) {

    btnCarregarMais.classList.remove("oculto");

    btnCarregarMais.textContent =
      `Mostrar mais (${todasAsFotos.length - quantidadeExibida} restantes)`;

  } else {

    btnCarregarMais.classList.add("oculto");

  }

}



function salvarProjetoLocal(folderId, link) {

  const projeto = {

    folderId,

    link,

    total: todasAsFotos.length,

    fotos: todasAsFotos.map((foto) => ({

      id: foto.id,

      name: foto.name,

      mimeType: foto.mimeType,

      webViewLink: foto.webViewLink || ""

    })),

    analisadas: 0,

    finalistas: 0,

    dataConexao: new Date().toISOString()

  };


  try {

    localStorage.setItem(
      "projetoFotosCasamento",
      JSON.stringify(projeto)
    );


    console.log(
      "Projeto salvo localmente."
    );


  } catch (erro) {

    console.warn(
      "Não foi possível salvar todas as informações localmente.",
      erro
    );

  }

}



function atualizarPainelInicial(total) {

  totalFotos.textContent = total;

  analisadas.textContent = "0";

  restantes.textContent = total;

  finalistas.textContent = "0";


  progresso.textContent =
    `0 / ${total} fotos`;


  porcentagem.textContent = "0%";

  barra.style.width = "0%";

}



btnConectar.addEventListener(
  "click",
  async () => {

    const link = driveLink.value.trim();


    if (!link) {

      alert(
        "Cole primeiro o link público da pasta do Google Drive."
      );

      return;

    }


    const folderId =
      extrairIdPasta(link);


    if (!folderId) {

      alert(
        "Não consegui identificar o ID dessa pasta."
      );

      return;

    }


    btnConectar.disabled = true;

    btnConectar.textContent =
      "Buscando fotos...";


    statusPasta.textContent =
      "Conectando ao Google Drive...";


    galeria.innerHTML = "";

    quantidadeExibida = 0;


    try {

      todasAsFotos =
        await buscarFotosDaPasta(folderId);


      if (
        todasAsFotos.length === 0
      ) {

        statusPasta.textContent =
          "Nenhuma fotografia encontrada.";

        return;

      }


      atualizarPainelInicial(
        todasAsFotos.length
      );


      statusPasta.textContent =
        `✓ Pasta conectada — ${todasAsFotos.length} fotografias encontradas.`;


      infoGaleria.textContent =
        `${todasAsFotos.length} fotografias disponíveis para análise.`;


      btnIniciar.disabled = false;


      salvarProjetoLocal(
        folderId,
        link
      );


      mostrarMaisFotos();


      alert(
        `Pasta conectada com sucesso!\n\n` +
        `${todasAsFotos.length} fotografias encontradas.`
      );


    } catch (erro) {

      console.error(erro);


      statusPasta.textContent =
        "Erro ao acessar a pasta.";


      alert(
        "Não foi possível acessar a pasta.\n\n" +
        erro.message
      );


    } finally {

      btnConectar.disabled = false;

      btnConectar.textContent =
        "Conectar pasta";

    }

  }
);



btnCarregarMais.addEventListener(
  "click",
  mostrarMaisFotos
);



btnIniciar.addEventListener(
  "click",
  () => {

    alert(
      "As fotografias estão prontas.\n\n" +
      "A integração com a IA será adicionada na próxima etapa."
    );

  }
);