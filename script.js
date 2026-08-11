// ======================================================
// CONFIGURAÇÕES
// ======================================================

// COLE SUA CHAVE DO GOOGLE DRIVE ENTRE AS ASPAS
const API_KEY = "AIzaSyAPl2tgM9c07P0FtM9saMMvWa8vi_rzR08";

const WORKER_URL =
  "https://analisador-fotos-api.ezequielsilva2614.workers.dev/";

const FOTOS_POR_PAGINA = 24;

// 6 segundos de intervalo entre análises automáticas.
const INTERVALO_ANALISE = 6000;


// ======================================================
// ELEMENTOS
// ======================================================

const btnConectar =
  document.getElementById("btnConectar");

const btnBuscar =
  document.getElementById("btnBuscar");

const btnContinuar =
  document.getElementById("btnContinuar");

const btnPausar =
  document.getElementById("btnPausar");

const btnCarregarMais =
  document.getElementById("btnCarregarMais");


const driveLink =
  document.getElementById("driveLink");

const buscaFoto =
  document.getElementById("buscaFoto");

const quantidadeAnalise =
  document.getElementById("quantidadeAnalise");


const totalFotos =
  document.getElementById("totalFotos");

const analisadas =
  document.getElementById("analisadas");

const restantes =
  document.getElementById("restantes");

const finalistas =
  document.getElementById("finalistas");

const progresso =
  document.getElementById("progresso");

const porcentagem =
  document.getElementById("porcentagem");

const barra =
  document.getElementById("barra");


const statusPasta =
  document.getElementById("statusPasta");

const statusAnalise =
  document.getElementById("statusAnalise");

const infoGaleria =
  document.getElementById("infoGaleria");

const galeria =
  document.getElementById("galeria");

const resultadoBusca =
  document.getElementById("resultadoBusca");

const rankingGrid =
  document.getElementById("rankingGrid");

const resultadosAnalise =
  document.getElementById("resultadosAnalise");


// ======================================================
// VARIÁVEIS
// ======================================================

let todasAsFotos = [];

let quantidadeExibida = 0;

let analiseEmAndamento = false;

let pausaSolicitada = false;


// ======================================================
// UTILITÁRIOS
// ======================================================

function esperar(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  );
}


function extrairIdPasta(link) {

  const match =
    link.match(
      /\/folders\/([a-zA-Z0-9_-]+)/
    );

  return match
    ? match[1]
    : null;
}


function criarUrlMiniatura(
  id,
  tamanho = 500
) {

  return (
    `https://drive.google.com/thumbnail` +
    `?id=${id}` +
    `&sz=w${tamanho}`
  );

}


// ======================================================
// RESULTADOS SALVOS
// ======================================================

function carregarResultados() {

  try {

    const salvo =
      localStorage.getItem(
        "resultadosAnaliseCasamento"
      );


    if (!salvo) {
      return [];
    }


    const dados =
      JSON.parse(salvo);


    return Array.isArray(dados)
      ? dados
      : [];

  } catch {

    return [];

  }

}


function salvarResultados(
  resultados
) {

  localStorage.setItem(
    "resultadosAnaliseCasamento",
    JSON.stringify(resultados)
  );

}


function fotoJaAnalisada(id) {

  return carregarResultados()
    .some(
      registro =>
        registro.id === id
    );

}


function salvarResultado(
  foto,
  resultado
) {

  const resultados =
    carregarResultados();


  const indiceExistente =
    resultados.findIndex(
      item => item.id === foto.id
    );


  const registro = {

    id:
      foto.id,

    arquivo:
      foto.name,

    indice:
      todasAsFotos.findIndex(
        item =>
          item.id === foto.id
      ),

    dataAnalise:
      new Date().toISOString(),

    resultado

  };


  if (indiceExistente >= 0) {

    resultados[indiceExistente] =
      registro;

  } else {

    resultados.push(
      registro
    );

  }


  salvarResultados(
    resultados
  );

}


// ======================================================
// GOOGLE DRIVE
// ======================================================

async function buscarFotosDaPasta(
  folderId
) {

  let fotos = [];

  let pageToken = "";


  do {

    const query =
      encodeURIComponent(
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


      throw new Error(
        erro?.error?.message ||
        "Erro ao acessar o Google Drive."
      );

    }


    const dados =
      await resposta.json();


    const imagens =
      (dados.files || [])
        .filter(
          arquivo =>
            arquivo.mimeType
              ?.startsWith("image/")
        );


    fotos =
      fotos.concat(
        imagens
      );


    pageToken =
      dados.nextPageToken || "";


  } while (pageToken);


  return fotos;

}


// ======================================================
// IA
// ======================================================

async function analisarUmaFoto(
  foto
) {

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


  const resultado =
    await resposta.json();


  if (!resposta.ok) {

    const detalhe =
      resultado
        ?.detalhes
        ?.error
        ?.message;


    throw new Error(
      detalhe ||
      resultado?.erro ||
      "Erro durante a análise."
    );

  }


  return resultado;

}


// ======================================================
// PROGRESSO
// ======================================================

function atualizarProgresso() {

  const resultados =
    carregarResultados();


  const qtd =
    resultados.length;


  totalFotos.textContent =
    todasAsFotos.length;


  analisadas.textContent =
    qtd;


  restantes.textContent =
    Math.max(
      todasAsFotos.length - qtd,
      0
    );


  progresso.textContent =
    `${qtd} / ${todasAsFotos.length} fotos`;


  const percentual =
    todasAsFotos.length
      ? qtd / todasAsFotos.length * 100
      : 0;


  porcentagem.textContent =
    `${percentual.toFixed(2)}%`;


  barra.style.width =
    `${percentual}%`;


  finalistas.textContent =
    calcularFinalistas();

}


function calcularFinalistas() {

  const resultados =
    carregarResultados();


  return resultados.filter(
    item =>
      calcularNotaGeral(
        item.resultado
      ) >= 9
  ).length;

}


// ======================================================
// NOTA GERAL
// ======================================================

function calcularNotaGeral(r) {

  const campos = [

    r.composicao,
    r.iluminacao,
    r.nitidez,
    r.favorecimento_noiva,
    r.favorecimento_noivo,
    r.sorriso_expressao_geral,
    r.conexao_casal,
    r.romantismo,
    r.espontaneidade,
    r.aproveitamento_cenario,
    r.impacto_emocional,
    r.representar_casamento

  ];


  const validos =
    campos.filter(
      valor =>
        typeof valor === "number"
    );


  if (!validos.length) {
    return 0;
  }


  return (
    validos.reduce(
      (a, b) => a + b,
      0
    ) /
    validos.length
  );

}


// ======================================================
// GALERIA
// ======================================================

function renderizarGaleria() {

  galeria.innerHTML =
    "";


  quantidadeExibida =
    0;


  mostrarMaisFotos();

}


function mostrarMaisFotos() {

  const inicio =
    quantidadeExibida;


  const fim =
    Math.min(
      inicio + FOTOS_POR_PAGINA,
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
        foto.id
      );


    imagem.loading =
      "lazy";


    const badge =
      document.createElement("div");


    badge.className =
      "badge";


    badge.textContent =
      fotoJaAnalisada(foto.id)
        ? "✅ Analisada"
        : "⚪ Não analisada";


    const info =
      document.createElement("div");


    info.className =
      "foto-info";


    info.innerHTML = `

      <div class="foto-nome">
        ${foto.name}
      </div>

      <div class="foto-numero">
        Foto ${i + 1}
      </div>

    `;


    card.append(
      imagem,
      badge,
      info
    );


    galeria.appendChild(
      card
    );

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
// BUSCADOR
// ======================================================

function buscarFotografia(
  texto
) {

  const termo =
    texto
      .toLowerCase()
      .replace(/\s/g, "");


  if (!termo) {
    return [];
  }


  return todasAsFotos.filter(
    foto =>
      foto.name
        .toLowerCase()
        .includes(termo)
  );

}


function exibirResultadoBusca(
  fotos
) {

  resultadoBusca.innerHTML =
    "";


  resultadoBusca.classList
    .remove("oculto");


  if (!fotos.length) {

    resultadoBusca.innerHTML =
      "<p>Nenhuma fotografia encontrada.</p>";

    return;

  }


  fotos.slice(0, 10)
    .forEach(
      foto => {

        const analisada =
          fotoJaAnalisada(
            foto.id
          );


        const card =
          document.createElement(
            "div"
          );


        card.className =
          "busca-card";


        card.innerHTML = `

          <img
            src="${criarUrlMiniatura(foto.id, 800)}"
            alt="${foto.name}"
          >

          <div class="busca-info">

            <h3>
              ${foto.name}
            </h3>

            <p>
              ${
                analisada
                  ? "✅ Esta fotografia já foi analisada."
                  : "⚪ Esta fotografia ainda não foi analisada."
              }
            </p>

            <button
              data-id="${foto.id}"
              class="btn-analisar-individual"
            >
              ${
                analisada
                  ? "Ver análise"
                  : "Analisar com IA"
              }
            </button>

          </div>

        `;


        resultadoBusca
          .appendChild(
            card
          );

      }
    );


  document
    .querySelectorAll(
      ".btn-analisar-individual"
    )
    .forEach(
      botao => {

        botao.addEventListener(
          "click",
          async () => {

            const foto =
              todasAsFotos.find(
                item =>
                  item.id ===
                  botao.dataset.id
              );


            if (!foto) {
              return;
            }


            if (
              fotoJaAnalisada(
                foto.id
              )
            ) {

              mostrarAnaliseExistente(
                foto.id
              );

            } else {

              await analisarFotoIndividual(
                foto
              );

            }

          }
        );

      }
    );

}


// ======================================================
// ANÁLISE INDIVIDUAL
// ======================================================

async function analisarFotoIndividual(
  foto
) {

  if (analiseEmAndamento) {

    alert(
      "Já existe uma análise em andamento."
    );

    return;

  }


  analiseEmAndamento =
    true;


  statusAnalise.textContent =
    `🤖 Analisando ${foto.name}...`;


  try {

    const resultado =
      await analisarUmaFoto(
        foto
      );


    salvarResultado(
      foto,
      resultado
    );


    atualizarTudo();


    mostrarAnaliseExistente(
      foto.id
    );


    statusAnalise.textContent =
      `✓ ${foto.name} analisada e salva.`;


  } catch (erro) {

    statusAnalise.textContent =
      "❌ Erro durante a análise.";


    alert(
      erro.message
    );


  } finally {

    analiseEmAndamento =
      false;

  }

}


// ======================================================
// MOSTRAR ANÁLISE
// ======================================================

function mostrarAnaliseExistente(
  id
) {

  const registro =
    carregarResultados()
      .find(
        item =>
          item.id === id
      );


  if (!registro) {
    return;
  }


  const r =
    registro.resultado;


  const nota =
    calcularNotaGeral(r);


  alert(

    `${registro.arquivo}\n\n` +

    `Nota geral provisória: ${nota.toFixed(2)}\n\n` +

    `🎨 Composição: ${r.composicao ?? "-"}\n` +
    `💡 Iluminação: ${r.iluminacao ?? "-"}\n` +
    `📷 Nitidez: ${r.nitidez ?? "-"}\n` +

    `👰 Noiva: ${r.favorecimento_noiva ?? "-"}\n` +
    `🤵 Noivo: ${r.favorecimento_noivo ?? "-"}\n` +

    `😊 Expressão: ${r.sorriso_expressao_geral ?? "-"}\n` +
    `💑 Conexão: ${r.conexao_casal ?? "-"}\n` +
    `❤️ Romantismo: ${r.romantismo ?? "-"}\n` +

    `📱 Instagram: ${r.instagram ?? "-"}\n` +
    `🌐 Site/Convite: ${r.site_convite ?? "-"}`

  );

}


// ======================================================
// CONTINUAR ANÁLISE
// ======================================================

function encontrarProximaNaoAnalisada(
  inicio = 0
) {

  for (
    let i = inicio;
    i < todasAsFotos.length;
    i++
  ) {

    if (
      !fotoJaAnalisada(
        todasAsFotos[i].id
      )
    ) {

      return i;

    }

  }


  return -1;

}


async function analisarProximas(
  quantidade
) {

  if (analiseEmAndamento) {
    return;
  }


  analiseEmAndamento =
    true;


  pausaSolicitada =
    false;


  btnContinuar.disabled =
    true;


  btnPausar.disabled =
    false;


  let concluidasAgora =
    0;


  try {

    while (
      concluidasAgora <
      quantidade
    ) {

      if (pausaSolicitada) {

        statusAnalise.textContent =
          "⏸ Análise pausada.";

        break;

      }


      const indice =
        encontrarProximaNaoAnalisada();


      if (indice === -1) {

        statusAnalise.textContent =
          "🎉 Todas as fotografias foram analisadas.";

        break;

      }


      const foto =
        todasAsFotos[indice];


      statusAnalise.textContent =
        `🤖 Analisando ${foto.name}... ` +
        `(${concluidasAgora + 1}/${quantidade})`;


      const resultado =
        await analisarUmaFoto(
          foto
        );


      salvarResultado(
        foto,
        resultado
      );


      concluidasAgora++;


      atualizarTudo();


      statusAnalise.textContent =
        `✓ ${foto.name} salva.`;


      if (
        concluidasAgora <
        quantidade
      ) {

        await esperar(
          INTERVALO_ANALISE
        );

      }

    }


    if (!pausaSolicitada) {

      statusAnalise.textContent =
        `✓ ${concluidasAgora} nova(s) fotografia(s) analisada(s).`;

    }


  } catch (erro) {

    console.error(
      erro
    );


    statusAnalise.textContent =
      "❌ Análise interrompida.";


    alert(
      "A análise foi interrompida.\n\n" +
      erro.message +
      "\n\nAs fotografias concluídas continuam salvas."
    );


  } finally {

    analiseEmAndamento =
      false;


    btnContinuar.disabled =
      false;


    btnPausar.disabled =
      true;

  }

}


// ======================================================
// RANKINGS
// ======================================================

function melhorPorCampo(
  campo
) {

  const resultados =
    carregarResultados()
      .filter(
        item =>
          typeof item.resultado?.[campo]
          === "number"
      );


  if (!resultados.length) {
    return null;
  }


  resultados.sort(
    (a, b) =>
      b.resultado[campo] -
      a.resultado[campo]
  );


  return resultados[0];

}


function melhorGeral() {

  const resultados =
    carregarResultados();


  if (!resultados.length) {
    return null;
  }


  return [...resultados]
    .sort(
      (a, b) =>
        calcularNotaGeral(
          b.resultado
        ) -
        calcularNotaGeral(
          a.resultado
        )
    )[0];

}


function atualizarRankings() {

  const resultados =
    carregarResultados();


  if (!resultados.length) {

    rankingGrid.innerHTML =
      "<p>Nenhuma fotografia analisada ainda.</p>";

    return;

  }


  const categorias = [

    [
      "🏆 Melhor foto geral",
      melhorGeral(),
      null
    ],

    [
      "❤️ Melhor romântica",
      melhorPorCampo("romantismo"),
      "romantismo"
    ],

    [
      "😊 Melhor sorriso/expressão",
      melhorPorCampo("sorriso_expressao_geral"),
      "sorriso_expressao_geral"
    ],

    [
      "💑 Melhor conexão do casal",
      melhorPorCampo("conexao_casal"),
      "conexao_casal"
    ],

    [
      "👰 Noiva mais favorecida",
      melhorPorCampo("favorecimento_noiva"),
      "favorecimento_noiva"
    ],

    [
      "🤵 Noivo mais favorecido",
      melhorPorCampo("favorecimento_noivo"),
      "favorecimento_noivo"
    ],

    [
      "🎨 Melhor composição",
      melhorPorCampo("composicao"),
      "composicao"
    ],

    [
      "🌅 Melhor cenário",
      melhorPorCampo("aproveitamento_cenario"),
      "aproveitamento_cenario"
    ],

    [
      "💡 Melhor iluminação",
      melhorPorCampo("iluminacao"),
      "iluminacao"
    ],

    [
      "📸 Mais espontânea",
      melhorPorCampo("espontaneidade"),
      "espontaneidade"
    ],

    [
      "💍 Representar casamento",
      melhorPorCampo("representar_casamento"),
      "representar_casamento"
    ],

    [
      "🖼️ Impressão grande",
      melhorPorCampo("impressao_grande"),
      "impressao_grande"
    ],

    [
      "📱 Instagram",
      melhorPorCampo("instagram"),
      "instagram"
    ],

    [
      "🌐 Site/Convite",
      melhorPorCampo("site_convite"),
      "site_convite"
    ]

  ];


  rankingGrid.innerHTML =
    "";


  categorias.forEach(
    ([titulo, registro, campo]) => {

      if (!registro) {
        return;
      }


      let nota;


      if (campo) {

        nota =
          registro.resultado[campo];

      } else {

        nota =
          calcularNotaGeral(
            registro.resultado
          ).toFixed(2);

      }


      const item =
        document.createElement(
          "div"
        );


      item.className =
        "ranking-item";


      item.innerHTML = `

        <strong>
          ${titulo}
        </strong>

        <span>
          ${registro.arquivo}
          — ${nota}
        </span>

      `;


      rankingGrid
        .appendChild(
          item
        );

    }
  );

}


// ======================================================
// ÚLTIMOS RESULTADOS
// ======================================================

function atualizarUltimosResultados() {

  const resultados =
    carregarResultados();


  if (!resultados.length) {

    resultadosAnalise.innerHTML =
      "<p>Nenhuma análise disponível.</p>";

    return;

  }


  resultadosAnalise.innerHTML =
    "";


  [...resultados]
    .reverse()
    .slice(0, 10)
    .forEach(
      registro => {

        const nota =
          calcularNotaGeral(
            registro.resultado
          );


        const div =
          document.createElement(
            "div"
          );


        div.className =
          "resultado-item";


        div.innerHTML = `

          <strong>
            ${registro.arquivo}
          </strong>

          <div class="resultado-notas">

            Nota geral:
            ${nota.toFixed(2)}

            • Composição:
            ${registro.resultado.composicao ?? "-"}

            • Conexão:
            ${registro.resultado.conexao_casal ?? "-"}

            • Romantismo:
            ${registro.resultado.romantismo ?? "-"}

          </div>

        `;


        resultadosAnalise
          .appendChild(
            div
          );

      }
    );

}


// ======================================================
// ATUALIZAR TUDO
// ======================================================

function atualizarTudo() {

  atualizarProgresso();

  atualizarRankings();

  atualizarUltimosResultados();

  renderizarGaleria();

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
        "Cole o link da pasta."
      );

      return;

    }


    const folderId =
      extrairIdPasta(
        link
      );


    if (!folderId) {

      alert(
        "Link de pasta inválido."
      );

      return;

    }


    btnConectar.disabled =
      true;


    statusPasta.textContent =
      "Buscando fotografias...";


    try {

      todasAsFotos =
        await buscarFotosDaPasta(
          folderId
        );


      statusPasta.textContent =
        `✓ ${todasAsFotos.length} fotografias encontradas.`;


      infoGaleria.textContent =
        `${todasAsFotos.length} fotografias disponíveis.`;


      buscaFoto.disabled =
        false;


      btnBuscar.disabled =
        false;


      quantidadeAnalise.disabled =
        false;


      btnContinuar.disabled =
        false;


      atualizarTudo();


    } catch (erro) {

      alert(
        erro.message
      );


      statusPasta.textContent =
        "Erro ao conectar pasta.";


    } finally {

      btnConectar.disabled =
        false;

    }

  }
);


// ======================================================
// BUSCAR
// ======================================================

btnBuscar.addEventListener(
  "click",
  () => {

    const fotos =
      buscarFotografia(
        buscaFoto.value
      );


    exibirResultadoBusca(
      fotos
    );

  }
);


buscaFoto.addEventListener(
  "keydown",
  evento => {

    if (
      evento.key === "Enter"
    ) {

      btnBuscar.click();

    }

  }
);


// ======================================================
// CONTINUAR
// ======================================================

btnContinuar.addEventListener(
  "click",
  async () => {

    const quantidade =
      Number(
        quantidadeAnalise.value
      );


    if (
      !quantidade ||
      quantidade < 1
    ) {

      alert(
        "Informe uma quantidade válida."
      );

      return;

    }


    await analisarProximas(
      quantidade
    );

  }
);


// ======================================================
// PAUSAR
// ======================================================

btnPausar.addEventListener(
  "click",
  () => {

    pausaSolicitada =
      true;


    btnPausar.disabled =
      true;


    statusAnalise.textContent =
      "⏸ Pausa solicitada. Finalizando a fotografia atual...";

  }
);


// ======================================================
// MOSTRAR MAIS
// ======================================================

btnCarregarMais.addEventListener(
  "click",
  mostrarMaisFotos
);