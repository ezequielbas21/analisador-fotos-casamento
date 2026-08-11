// ======================================================
// ANALISADOR DE FOTOS DO CASAMENTO
// Google Drive + Cloudflare Worker + Gemini
// TESTE CONTROLADO: FOTOS 2, 3, 4 e 5
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

// COLE AQUI SUA CHAVE DA GOOGLE DRIVE API
const API_KEY = "AIzaSyAPl2tgM9c07P0FtM9saMMvWa8vi_rzR08";

// Cloudflare Worker
const WORKER_URL =
  "https://analisador-fotos-api.ezequielsilva2614.workers.dev/";

// Fotos exibidas por página
const FOTOS_POR_PAGINA = 24;

// A foto de índice 0 foi a primeira já analisada.
// Agora vamos analisar índices 1, 2, 3 e 4.
const INDICE_INICIAL_TESTE = 1;
const QUANTIDADE_NOVAS_TESTE = 4;

// Intervalo entre chamadas à IA.
// Deixamos folga para não ficar encostando no limite.
const INTERVALO_ENTRE_ANALISES = 6000;


// ======================================================
// VARIÁVEIS
// ======================================================

let todasAsFotos = [];
let quantidadeExibida = 0;
let analisePausada = false;
let analiseEmAndamento = false;


// ======================================================
// UTILITÁRIOS
// ======================================================

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function extrairIdPasta(link) {
  const match = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);

  if (!match) {
    return null;
  }

  return match[1];
}


function criarUrlMiniatura(id, tamanho = 500) {
  return (
    `https://drive.google.com/thumbnail` +
    `?id=${id}&sz=w${tamanho}`
  );
}


// ======================================================
// GOOGLE DRIVE
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
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    const resposta = await fetch(url);

    if (!resposta.ok) {
      const erro = await resposta.json();

      console.error("Erro Google Drive:", erro);

      throw new Error(
        erro?.error?.message ||
        "Erro ao acessar o Google Drive."
      );
    }

    const dados = await resposta.json();

    const imagens = (dados.files || []).filter(
      arquivo => arquivo.mimeType?.startsWith("image/")
    );

    fotos = fotos.concat(imagens);

    pageToken = dados.nextPageToken || "";

  } while (pageToken);

  return fotos;
}


// ======================================================
// GALERIA
// ======================================================

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

    imagem.src = criarUrlMiniatura(foto.id, 500);
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
      `Mostrar mais (` +
      `${todasAsFotos.length - quantidadeExibida} restantes)`;
  } else {
    btnCarregarMais.classList.add("oculto");
  }
}


// ======================================================
// SALVAMENTO
// ======================================================

function carregarResultadosSalvos() {
  try {
    const salvo = localStorage.getItem(
      "resultadosAnaliseCasamento"
    );

    if (!salvo) {
      return [];
    }

    const resultados = JSON.parse(salvo);

    return Array.isArray(resultados)
      ? resultados
      : [];

  } catch (erro) {
    console.warn(
      "Erro ao carregar resultados salvos:",
      erro
    );

    return [];
  }
}


function salvarResultados(resultados) {
  localStorage.setItem(
    "resultadosAnaliseCasamento",
    JSON.stringify(resultados)
  );
}


function salvarResultadoIndividual(foto, resultado) {
  const resultados = carregarResultadosSalvos();

  const registro = {
    id: foto.id,
    arquivo: foto.name,
    indice: todasAsFotos.findIndex(
      item => item.id === foto.id
    ),
    dataAnalise: new Date().toISOString(),
    resultado
  };

  const indiceExistente = resultados.findIndex(
    item => item.id === foto.id
  );

  if (indiceExistente >= 0) {
    resultados[indiceExistente] = registro;
  } else {
    resultados.push(registro);
  }

  salvarResultados(resultados);

  console.log(
    "✓ Resultado salvo:",
    foto.name
  );

  return resultados;
}


function salvarProjetoLocal(folderId, link) {
  const projeto = {
    folderId,
    link,
    total: todasAsFotos.length,

    fotos: todasAsFotos.map(foto => ({
      id: foto.id,
      name: foto.name,
      mimeType: foto.mimeType,
      webViewLink: foto.webViewLink || ""
    })),

    dataConexao: new Date().toISOString()
  };

  try {
    localStorage.setItem(
      "projetoFotosCasamento",
      JSON.stringify(projeto)
    );
  } catch (erro) {
    console.warn(
      "Não foi possível salvar o projeto.",
      erro
    );
  }
}


// ======================================================
// PAINEL
// ======================================================

function atualizarPainelInicial(total) {
  const resultados =
    carregarResultadosSalvos();

  const quantidadeSalva =
    resultados.length;

  totalFotos.textContent =
    total;

  analisadas.textContent =
    quantidadeSalva;

  restantes.textContent =
    Math.max(
      total - quantidadeSalva,
      0
    );

  finalistas.textContent =
    "0";

  progresso.textContent =
    `${quantidadeSalva} / ${total} fotos`;

  const percentual =
    total > 0
      ? quantidadeSalva / total * 100
      : 0;

  porcentagem.textContent =
    `${percentual.toFixed(2)}%`;

  barra.style.width =
    `${percentual}%`;
}


function atualizarProgresso() {
  const resultados =
    carregarResultadosSalvos();

  const quantidade =
    resultados.length;

  analisadas.textContent =
    quantidade;

  restantes.textContent =
    Math.max(
      todasAsFotos.length - quantidade,
      0
    );

  progresso.textContent =
    `${quantidade} / ${todasAsFotos.length} fotos`;

  const percentual =
    todasAsFotos.length > 0
      ? quantidade / todasAsFotos.length * 100
      : 0;

  porcentagem.textContent =
    `${percentual.toFixed(2)}%`;

  barra.style.width =
    `${percentual}%`;
}


// ======================================================
// IA
// ======================================================

async function analisarUmaFoto(foto) {
  console.log(
    "Enviando fotografia para análise:",
    foto.name
  );

  const resposta = await fetch(
    WORKER_URL,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        driveFileId: foto.id,
        fileName: foto.name
      })
    }
  );

  let resultado;

  try {
    resultado = await resposta.json();
  } catch {
    throw new Error(
      "O servidor respondeu em formato inesperado."
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
// CRIAR RESULTADOS VISUAIS NA PÁGINA
// ======================================================

function obterOuCriarAreaResultados() {
  let area =
    document.getElementById(
      "resultadosTesteIA"
    );

  if (area) {
    return area;
  }

  area =
    document.createElement("section");

  area.id =
    "resultadosTesteIA";

  area.style.marginTop =
    "50px";

  area.style.padding =
    "30px";

  area.style.background =
    "#191919";

  area.style.borderRadius =
    "18px";

  const titulo =
    document.createElement("h2");

  titulo.textContent =
    "Resultados do teste com IA";

  const descricao =
    document.createElement("p");

  descricao.textContent =
    "Avaliações salvas automaticamente.";

  descricao.style.marginBottom =
    "25px";

  area.appendChild(titulo);
  area.appendChild(descricao);

  const rankingPreview =
    document.querySelector(
      ".ranking-preview"
    );

  if (rankingPreview) {
    rankingPreview.parentNode.insertBefore(
      area,
      rankingPreview
    );
  } else {
    document.querySelector(".container")
      .appendChild(area);
  }

  return area;
}


function mostrarResultadoNaTela(
  foto,
  resultado
) {
  const area =
    obterOuCriarAreaResultados();

  const card =
    document.createElement("div");

  card.style.background =
    "#222";

  card.style.padding =
    "20px";

  card.style.borderRadius =
    "12px";

  card.style.marginBottom =
    "15px";


  const titulo =
    document.createElement("h3");

  titulo.textContent =
    foto.name;

  titulo.style.marginBottom =
    "15px";


  const notas =
    document.createElement("div");

  notas.innerHTML = `
    <p>🎨 Composição: <strong>${resultado.composicao ?? "-"}</strong></p>
    <p>💡 Iluminação: <strong>${resultado.iluminacao ?? "-"}</strong></p>
    <p>📷 Nitidez: <strong>${resultado.nitidez ?? "-"}</strong></p>
    <p>👰 Noiva favorecida: <strong>${resultado.favorecimento_noiva ?? "-"}</strong></p>
    <p>🤵 Noivo favorecido: <strong>${resultado.favorecimento_noivo ?? "-"}</strong></p>
    <p>😊 Expressão geral: <strong>${resultado.sorriso_expressao_geral ?? "-"}</strong></p>
    <p>💑 Conexão: <strong>${resultado.conexao_casal ?? "-"}</strong></p>
    <p>❤️ Romantismo: <strong>${resultado.romantismo ?? "-"}</strong></p>
    <p>📸 Espontaneidade: <strong>${resultado.espontaneidade ?? "-"}</strong></p>
    <p>🌅 Cenário: <strong>${resultado.aproveitamento_cenario ?? "-"}</strong></p>
    <p>📱 Instagram: <strong>${resultado.instagram ?? "-"}</strong></p>
    <p>🌐 Site/Convite: <strong>${resultado.site_convite ?? "-"}</strong></p>
  `;


  if (
    Array.isArray(resultado.pontos_fortes) &&
    resultado.pontos_fortes.length > 0
  ) {
    const fortes =
      document.createElement("p");

    fortes.style.marginTop =
      "15px";

    fortes.innerHTML =
      `<strong>Pontos fortes:</strong> ` +
      resultado.pontos_fortes.join(" • ");

    card.appendChild(titulo);
    card.appendChild(notas);
    card.appendChild(fortes);
  } else {
    card.appendChild(titulo);
    card.appendChild(notas);
  }


  if (
    Array.isArray(resultado.problemas) &&
    resultado.problemas.length > 0
  ) {
    const problemas =
      document.createElement("p");

    problemas.style.marginTop =
      "10px";

    problemas.innerHTML =
      `<strong>Atenção:</strong> ` +
      resultado.problemas.join(" • ");

    card.appendChild(problemas);
  }


  if (resultado.observacao) {
    const observacao =
      document.createElement("p");

    observacao.style.marginTop =
      "10px";

    observacao.textContent =
      resultado.observacao;

    card.appendChild(observacao);
  }


  area.appendChild(card);
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
      console.error(erro);

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
// MOSTRAR MAIS
// ======================================================

btnCarregarMais.addEventListener(
  "click",
  mostrarMaisFotos
);


// ======================================================
// TESTE DE 4 NOVAS FOTOS
// ======================================================

btnIniciar.addEventListener(
  "click",
  async () => {

    if (todasAsFotos.length === 0) {
      alert(
        "Conecte primeiro a pasta."
      );

      return;
    }


    if (analiseEmAndamento) {
      return;
    }


    analiseEmAndamento =
      true;

    analisePausada =
      false;


    btnIniciar.disabled =
      true;

    btnConectar.disabled =
      true;

    btnPausar.disabled =
      false;

    btnIniciar.textContent =
      "IA analisando...";


    const inicio =
      INDICE_INICIAL_TESTE;

    const fim =
      Math.min(
        inicio + QUANTIDADE_NOVAS_TESTE,
        todasAsFotos.length
      );


    try {

      for (
        let i = inicio;
        i < fim;
        i++
      ) {

        if (analisePausada) {
          statusPasta.textContent =
            "⏸ Análise pausada.";

          break;
        }


        const foto =
          todasAsFotos[i];


        const jaSalvos =
          carregarResultadosSalvos();


        const jaExiste =
          jaSalvos.some(
            item => item.id === foto.id
          );


        if (jaExiste) {
          console.log(
            `Pulando ${foto.name}: já analisada.`
          );

          continue;
        }


        statusPasta.textContent =
          `🤖 Analisando ${foto.name}...`;


        progresso.textContent =
          `IA analisando foto ${i + 1} de ${todasAsFotos.length}`;


        const resultado =
          await analisarUmaFoto(
            foto
          );


        salvarResultadoIndividual(
          foto,
          resultado
        );


        mostrarResultadoNaTela(
          foto,
          resultado
        );


        atualizarProgresso();


        console.log(
          `✓ ${foto.name} concluída.`,
          resultado
        );


        // Espera antes da próxima chamada.
        if (i < fim - 1) {
          statusPasta.textContent =
            `✓ ${foto.name} salva. Aguardando próxima foto...`;

          await esperar(
            INTERVALO_ENTRE_ANALISES
          );
        }
      }


      if (!analisePausada) {
        statusPasta.textContent =
          "✓ Teste concluído.";

        const resultados =
          carregarResultadosSalvos();

        alert(
          `TESTE CONCLUÍDO!\n\n` +
          `${resultados.length} análises estão salvas neste navegador.\n\n` +
          `As fotos 2 a 5 foram processadas sem repetir a primeira requisição.`
        );
      }

    } catch (erro) {
      console.error(
        "Erro durante o teste:",
        erro
      );

      statusPasta.textContent =
        "❌ Erro durante a análise.";

      alert(
        "A análise foi interrompida.\n\n" +
        erro.message +
        "\n\nTudo que terminou antes do erro continua salvo."
      );

    } finally {
      analiseEmAndamento =
        false;

      btnIniciar.disabled =
        false;

      btnConectar.disabled =
        false;

      btnPausar.disabled =
        true;

      btnIniciar.textContent =
        "Iniciar análise";
    }
  }
);


// ======================================================
// PAUSAR
// ======================================================

btnPausar.addEventListener(
  "click",
  () => {

    if (!analiseEmAndamento) {
      return;
    }

    analisePausada =
      true;

    btnPausar.disabled =
      true;

    statusPasta.textContent =
      "⏸ Pausa solicitada. Finalizando a foto atual...";
  }
);