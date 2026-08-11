// ======================================================
// ANALISADOR DE FOTOS DO CASAMENTO
// Google Drive + Cloudflare Worker + Gemini
// ======================================================


// ======================================================
// ELEMENTOS DA PÁGINA
// ======================================================

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


// ======================================================
// CONFIGURAÇÕES
// ======================================================

// IMPORTANTE:
// Coloque aqui SOMENTE sua chave da Google Drive API.
// Mantenha a chave entre aspas.
const API_KEY = "AIzaSyAPl2tgM9c07P0FtM9saMMvWa8vi_rzR08";


// Endereço do nosso backend protegido
const WORKER_URL =
  "https://analisador-fotos-api.ezequielsilva2614.workers.dev/";


// Quantidade de fotos mostradas por vez na galeria
const FOTOS_POR_PAGINA = 24;


// ======================================================
// VARIÁVEIS
// ======================================================

let todasAsFotos = [];

let quantidadeExibida = 0;


// ======================================================
// EXTRAIR ID DA PASTA DO GOOGLE DRIVE
// ======================================================

function extrairIdPasta(link) {

  const match =
    link.match(/\/folders\/([a-zA-Z0-9_-]+)/);

  if (!match) {
    return null;
  }

  return match[1];

}


// ======================================================
// BUSCAR TODAS AS FOTOS DA PASTA
// ======================================================

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

      url +=
        `&pageToken=${encodeURIComponent(pageToken)}`;

    }


    const resposta =
      await fetch(url);


    if (!resposta.ok) {

      const erro =
        await resposta.json();


      console.error(
        "Erro Google Drive:",
        erro
      );


      throw new Error(
        erro?.error?.message ||
        "Erro ao acessar o Google Drive."
      );

    }


    const dados =
      await resposta.json();


    const imagens =
      (dados.files || []).filter(
        (arquivo) =>
          arquivo.mimeType?.startsWith("image/")
      );


    fotos =
      fotos.concat(imagens);


    pageToken =
      dados.nextPageToken || "";


  } while (pageToken);


  return fotos;

}


// ======================================================
// CRIAR URL DA MINIATURA
// ======================================================

function criarUrlMiniatura(id, tamanho = 500) {

  return (
    `https://drive.google.com/thumbnail` +
    `?id=${id}&sz=w${tamanho}`
  );

}


// ======================================================
// MOSTRAR FOTOS NA GALERIA
// ======================================================

function mostrarMaisFotos() {

  const inicio =
    quantidadeExibida;


  const fim =
    Math.min(
      quantidadeExibida + FOTOS_POR_PAGINA,
      todasAsFotos.length
    );


  for (
    let i = inicio;
    i < fim;
    i++
  ) {

    const foto =
      todasAsFotos[i];


    const card =
      document.createElement("div");

    card.className =
      "foto-card";


    const imagem =
      document.createElement("img");

    imagem.src =
      criarUrlMiniatura(
        foto.id,
        500
      );

    imagem.alt =
      foto.name;

    imagem.loading =
      "lazy";


    imagem.onerror = () => {

      imagem.style.opacity =
        "0.25";

    };


    const info =
      document.createElement("div");

    info.className =
      "foto-info";


    const nome =
      document.createElement("div");

    nome.className =
      "foto-nome";

    nome.textContent =
      foto.name;


    const numero =
      document.createElement("div");

    numero.className =
      "foto-numero";

    numero.textContent =
      `Foto ${i + 1} de ${todasAsFotos.length}`;


    info.appendChild(nome);

    info.appendChild(numero);


    card.appendChild(imagem);

    card.appendChild(info);


    galeria.appendChild(card);

  }


  quantidadeExibida =
    fim;


  if (
    quantidadeExibida <
    todasAsFotos.length
  ) {

    btnCarregarMais
      .classList
      .remove("oculto");


    btnCarregarMais.textContent =
      `Mostrar mais (` +
      `${todasAsFotos.length - quantidadeExibida} restantes)`;


  } else {

    btnCarregarMais
      .classList
      .add("oculto");

  }

}


// ======================================================
// SALVAR INFORMAÇÕES DA PASTA LOCALMENTE
// ======================================================

function salvarProjetoLocal(
  folderId,
  link
) {

  const projeto = {

    folderId,

    link,

    total:
      todasAsFotos.length,

    fotos:
      todasAsFotos.map(
        (foto) => ({

          id:
            foto.id,

          name:
            foto.name,

          mimeType:
            foto.mimeType,

          webViewLink:
            foto.webViewLink || ""

        })
      ),

    analisadas: 0,

    finalistas: 0,

    dataConexao:
      new Date().toISOString()

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
      "Não foi possível salvar o projeto localmente.",
      erro
    );

  }

}


// ======================================================
// ATUALIZAR PAINEL
// ======================================================

function atualizarPainelInicial(total) {

  totalFotos.textContent =
    total;


  analisadas.textContent =
    "0";


  restantes.textContent =
    total;


  finalistas.textContent =
    "0";


  progresso.textContent =
    `0 / ${total} fotos`;


  porcentagem.textContent =
    "0%";


  barra.style.width =
    "0%";

}


// ======================================================
// TRANSFORMAR IMAGEM EM BASE64
// ======================================================

async function imagemParaBase64(url) {

  const resposta =
    await fetch(url);


  if (!resposta.ok) {

    throw new Error(
      "Não foi possível baixar a imagem para análise."
    );

  }


  const blob =
    await resposta.blob();


  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();


      reader.onloadend = () => {

        const resultado =
          reader.result;


        const base64 =
          resultado.split(",")[1];


        resolve({

          base64,

          mimeType:
            blob.type ||
            "image/jpeg"

        });

      };


      reader.onerror = () => {

        reject(
          new Error(
            "Erro ao converter a fotografia."
          )
        );

      };


      reader.readAsDataURL(blob);

    }
  );

}


// ======================================================
// ENVIAR UMA FOTO PARA O GEMINI
// ======================================================
async function analisarUmaFoto(foto) {

  console.log(
    "Enviando fotografia para análise:",
    foto.name
  );


  const resposta =
    await fetch(
      WORKER_URL,
      {

        method:
          "POST",

        headers: {

          "Content-Type":
            "application/json"

        },

        body:
          JSON.stringify({

            driveFileId:
              foto.id,

            fileName:
              foto.name

          })

      }
    );


  let resultado;


  try {

    resultado =
      await resposta.json();

  } catch {

    throw new Error(
      "O servidor respondeu em um formato inesperado."
    );

  }


  if (!resposta.ok) {

    console.error(
      "Erro retornado pelo Worker:",
      resultado
    );


    const detalheGemini =
      resultado
        ?.detalhes
        ?.error
        ?.message;


    throw new Error(
      detalheGemini ||
      resultado?.erro ||
      "Erro durante a análise da fotografia."
    );

  }


  return resultado;

}


// ======================================================
// CONECTAR PASTA
// ======================================================

btnConectar.addEventListener(
  "click",
  async () => {

    const link =
      driveLink.value.trim();


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


    btnConectar.disabled =
      true;


    btnConectar.textContent =
      "Buscando fotos...";


    statusPasta.textContent =
      "Conectando ao Google Drive...";


    galeria.innerHTML =
      "";


    quantidadeExibida =
      0;


    try {

      todasAsFotos =
        await buscarFotosDaPasta(
          folderId
        );


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
        `✓ Pasta conectada — ` +
        `${todasAsFotos.length} fotografias encontradas.`;


      infoGaleria.textContent =
        `${todasAsFotos.length} fotografias disponíveis para análise.`;


      btnIniciar.disabled =
        false;


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

      console.error(
        erro
      );


      statusPasta.textContent =
        "Erro ao acessar a pasta.";


      alert(
        "Não foi possível acessar a pasta.\n\n" +
        erro.message
      );


    } finally {

      btnConectar.disabled =
        false;


      btnConectar.textContent =
        "Conectar pasta";

    }

  }
);


// ======================================================
// MOSTRAR MAIS FOTOS
// ======================================================

btnCarregarMais.addEventListener(
  "click",
  mostrarMaisFotos
);


// ======================================================
// PRIMEIRO TESTE DA IA
// ======================================================

btnIniciar.addEventListener(
  "click",
  async () => {

    if (
      todasAsFotos.length === 0
    ) {

      alert(
        "Conecte primeiro a pasta do Google Drive."
      );

      return;

    }


    // IMPORTANTE:
    // Por enquanto analisaremos SOMENTE A PRIMEIRA FOTO.

    const fotoTeste =
      todasAsFotos[0];


    btnIniciar.disabled =
      true;


    btnIniciar.textContent =
      "IA analisando...";


    btnConectar.disabled =
      true;


    statusPasta.textContent =
      `🤖 Analisando ${fotoTeste.name}...`;


    progresso.textContent =
      `Testando IA com ${fotoTeste.name}`;


    try {

      const resultado =
        await analisarUmaFoto(
          fotoTeste
        );


      console.log(
        "================================="
      );

      console.log(
        "ANÁLISE DA PRIMEIRA FOTO"
      );

      console.log(
        resultado
      );

      console.log(
        "================================="
      );


      statusPasta.textContent =
        `✓ ${fotoTeste.name} analisada pela IA.`;


      // Atualiza a barra apenas como demonstração
      // de que UMA fotografia foi analisada.

      analisadas.textContent =
        "1";


      restantes.textContent =
        todasAsFotos.length - 1;


      progresso.textContent =
        `1 / ${todasAsFotos.length} fotos`;


      const percentual =
        (
          1 /
          todasAsFotos.length *
          100
        );


      porcentagem.textContent =
        `${percentual.toFixed(2)}%`;


      barra.style.width =
        `${percentual}%`;


      // Mostra um resumo da análise

      alert(
        `ANÁLISE CONCLUÍDA!\n\n` +

        `Arquivo:\n` +
        `${resultado.arquivo || fotoTeste.name}\n\n` +

        `🎨 Composição: ` +
        `${resultado.composicao ?? "-"}\n` +

        `💡 Iluminação: ` +
        `${resultado.iluminacao ?? "-"}\n` +

        `📷 Nitidez: ` +
        `${resultado.nitidez ?? "-"}\n\n` +

        `👰 Noiva favorecida: ` +
        `${resultado.favorecimento_noiva ?? "-"}\n` +

        `🤵 Noivo favorecido: ` +
        `${resultado.favorecimento_noivo ?? "-"}\n\n` +

        `😊 Expressão geral: ` +
        `${resultado.sorriso_expressao_geral ?? "-"}\n` +

        `💑 Conexão: ` +
        `${resultado.conexao_casal ?? "-"}\n` +

        `❤️ Romantismo: ` +
        `${resultado.romantismo ?? "-"}\n` +

        `📸 Espontaneidade: ` +
        `${resultado.espontaneidade ?? "-"}\n\n` +

        `🌅 Cenário: ` +
        `${resultado.aproveitamento_cenario ?? "-"}\n` +

        `📱 Instagram: ` +
        `${resultado.instagram ?? "-"}\n` +

        `🌐 Site/Convite: ` +
        `${resultado.site_convite ?? "-"}`
      );


    } catch (erro) {

      console.error(
        "ERRO NO TESTE DA IA:",
        erro
      );


      statusPasta.textContent =
        "❌ Erro durante o teste da IA.";


      progresso.textContent =
        `0 / ${todasAsFotos.length} fotos`;


      alert(
        "A análise com IA não funcionou.\n\n" +
        erro.message +
        "\n\nNão tente iniciar as 1.315 fotos."
      );


    } finally {

      btnIniciar.disabled =
        false;


      btnIniciar.textContent =
        "Iniciar análise";


      btnConectar.disabled =
        false;

    }

  }
);


// ======================================================
// BOTÃO PAUSAR
// ======================================================

btnPausar.addEventListener(
  "click",
  () => {

    alert(
      "O sistema de pausa será ativado quando liberarmos a análise em lote."
    );

  }
);