document.addEventListener("DOMContentLoaded", async () => {
  let dadosProdutos = {};
  let carrinho = JSON.parse(localStorage.getItem("graciosa_carrinho")) || [];
  let dadosEntrega = null;
  let valorFrete = 0;

  // Tabela de frete por UF mantida da sua estrutura original
  const tabelaFretePorUF = {
    "AL": { base: 12.00, porKg: 1.20, prazo: "1 a 3 dias úteis" },
    "SE": { base: 18.00, porKg: 2.00, prazo: "3 a 5 dias úteis" },
    "PE": { base: 18.00, porKg: 2.00, prazo: "3 a 5 dias úteis" },
    "PB": { base: 22.00, porKg: 2.50, prazo: "4 a 6 dias úteis" },
    "RN": { base: 22.00, porKg: 2.50, prazo: "4 a 6 dias úteis" },
    "CE": { base: 24.00, porKg: 2.80, prazo: "5 a 8 dias úteis" },
    "BA": { base: 24.00, porKg: 2.80, prazo: "5 a 8 dias úteis" },
    "SE_REG": { base: 32.00, porKg: 3.50, prazo: "6 a 10 dias úteis" },
    "SUL": { base: 38.00, porKg: 4.50, prazo: "7 a 12 dias úteis" },
    "CO": { base: 35.00, porKg: 4.00, prazo: "7 a 11 dias úteis" },
    "NORTE": { base: 48.00, porKg: 5.50, prazo: "10 a 18 dias úteis" }
  };

  // Carrega a base de dados JSON
  try {
    const resposta = await fetch("produtos.json");
    if (!resposta.ok) throw new Error("Erro ao carregar produtos.json");
    dadosProdutos = await resposta.json();
  } catch (e) {
    console.error("Falha ao buscar catálogo:", e);
  }

  // ELEMENTOS DO DOM
  const modalCarrinho = document.getElementById("modal-carrinho");
  const overlayCarrinho = document.getElementById("carrinho-overlay");
  const btnAbrirCarrinho = document.getElementById("btn-abrir-carrinho");
  const btnFecharCarrinho = document.getElementById("btn-fechar-carrinho");
  const qtdCarrinhoEl = document.getElementById("qtd-carrinho");
  const containerCarrinho = document.getElementById("container-carrinho");

  const inputCep = document.getElementById("cep");
  const btnCalcularFrete = document.getElementById("btn-calcular-frete");
  const divInfoFrete = document.getElementById("info-frete-detalhes");

  const displaySubtotal = document.getElementById("preco-subtotal");
  const displayPrecoFrete = document.getElementById("preco-frete");
  const displayPrecoTotal = document.getElementById("preco-total");

  const formCheckout = document.getElementById("form-checkout");
  const inputWhatsapp = document.getElementById("whatsapp");
  const selectPagamento = document.getElementById("pagamento-select");
  const boxPixInfo = document.getElementById("box-pix-info");

  function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function salvarCarrinho() {
    localStorage.setItem("graciosa_carrinho", JSON.stringify(carrinho));
    atualizarContador();
    renderizarCarrinho();
  }

  function atualizarContador() {
    if (qtdCarrinhoEl) qtdCarrinhoEl.textContent = carrinho.length;
  }

  // MODAL DE CARRINHO (ABRIR / FECHAR)
  function abrirCarrinho() {
    if (modalCarrinho && overlayCarrinho) {
      modalCarrinho.classList.add("active");
      overlayCarrinho.classList.add("active");
    }
  }

  function fecharCarrinho() {
    if (modalCarrinho && overlayCarrinho) {
      modalCarrinho.classList.remove("active");
      overlayCarrinho.classList.remove("active");
    }
  }

  if (btnAbrirCarrinho) btnAbrirCarrinho.addEventListener("click", abrirCarrinho);
  if (btnFecharCarrinho) btnFecharCarrinho.addEventListener("click", fecharCarrinho);
  if (overlayCarrinho) overlayCarrinho.addEventListener("click", fecharCarrinho);

  // RENDERIZAR CARRINHO
  function renderizarCarrinho() {
    if (!containerCarrinho) return;

    if (carrinho.length === 0) {
      containerCarrinho.innerHTML = `<p class="carrinho-vazio">Seu carrinho está vazio.<br>Escolha um calçado para começar!</p>`;
    } else {
      containerCarrinho.innerHTML = carrinho.map(item => `
        <div class="item-carrinho">
          <div class="item-detalhes">
            <h5>${item.nome}</h5>
            <p>Numeração: <strong>${item.numeral}</strong> - ${formatarMoeda(item.preco)}</p>
          </div>
          <button type="button" class="btn-remover-item" onclick="removerItemCarrinho(${item.id})">✕</button>
        </div>
      `).join('');
    }

    atualizarTotais();
  }

  window.removerItemCarrinho = function(id) {
    carrinho = carrinho.filter(item => item.id !== id);
    salvarCarrinho();
  };

  // CÁLCULO DE FRETE
  function recalcularFrete() {
    if (!dadosEntrega) return;

    const pesoTotal = carrinho.reduce((sum, item) => sum + item.peso, 0);
    const uf = dadosEntrega.uf;
    let regra = tabelaFretePorUF[uf];

    if (!regra) {
      if (["SP", "RJ", "MG", "ES"].includes(uf)) regra = tabelaFretePorUF["SE_REG"];
      else if (["PR", "SC", "RS"].includes(uf)) regra = tabelaFretePorUF["SUL"];
      else if (["DF", "GO", "MT", "MS"].includes(uf)) regra = tabelaFretePorUF["CO"];
      else regra = tabelaFretePorUF["NORTE"];
    }

    valorFrete = carrinho.length > 0 ? (regra.base + (pesoTotal * regra.porKg)) : 0;
    dadosEntrega.prazo = regra.prazo;
  }

  function atualizarTotais() {
    const subtotal = carrinho.reduce((sum, item) => sum + item.preco, 0);

    if (dadosEntrega) recalcularFrete();

    if (displaySubtotal) displaySubtotal.textContent = formatarMoeda(subtotal);
    if (displayPrecoFrete) displayPrecoFrete.textContent = formatarMoeda(valorFrete);
    if (displayPrecoTotal) displayPrecoTotal.textContent = formatarMoeda(subtotal + valorFrete);

    if (dadosEntrega && divInfoFrete && divInfoFrete.style.display !== "none") {
      divInfoFrete.innerHTML = `
        <strong>📍 Destino:</strong> ${dadosEntrega.cidade} - ${dadosEntrega.uf}<br>
        <strong>⏱️ Prazo Estimado:</strong> ${dadosEntrega.prazo}
      `;
    }
  }

  if (btnCalcularFrete) {
    btnCalcularFrete.addEventListener("click", async () => {
      const cep = inputCep.value.replace(/\D/g, '');

      if (cep.length !== 8) {
        alert("Digite um CEP válido com 8 dígitos.");
        return;
      }

      if (carrinho.length === 0) {
        alert("Adicione ao menos um calçado ao carrinho antes de calcular o frete.");
        return;
      }

      btnCalcularFrete.textContent = "...";
      btnCalcularFrete.disabled = true;

      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();

        if (data.erro) {
          alert("CEP não encontrado.");
          return;
        }

        dadosEntrega = {
          cidade: data.localidade,
          uf: data.uf,
          bairro: data.bairro
        };

        divInfoFrete.style.display = "block";
        atualizarTotais();
      } catch (err) {
        alert("Erro ao consultar o CEP.");
      } finally {
        btnCalcularFrete.textContent = "Calcular";
        btnCalcularFrete.disabled = false;
      }
    });
  }

  if (selectPagamento && boxPixInfo) {
    selectPagamento.addEventListener("change", (e) => {
      boxPixInfo.style.display = (e.target.value === "Pix") ? "block" : "none";
    });
  }

  // --- RENDERIZAR VITRINE DA INDEX.HTML ---
  const gridProdutos = document.getElementById("grid-produtos");
  const campoBusca = document.getElementById("campo-busca");

  function renderizarVitrine(filtro = "") {
    if (!gridProdutos) return;
    gridProdutos.innerHTML = "";

    Object.keys(dadosProdutos).forEach(key => {
      const prod = dadosProdutos[key];
      if (prod.nome.toLowerCase().includes(filtro.toLowerCase())) {
        const precoVal = prod.medidas["35"].preco; // preço base da numeração 35

        const card = document.createElement("div");
        card.className = "card-produto";
        card.innerHTML = `
          <div>
            <img src="${prod.imagem}" alt="${prod.nome}" class="img-card">
            <h3>${prod.nome}</h3>
            <p class="preco-card">${formatarMoeda(precoVal)}</p>
          </div>
          <a href="produto.html?id=${prod.id}" class="btn-primary">Ver Produto</a>
        `;
        gridProdutos.appendChild(card);
      }
    });
  }

  if (campoBusca) {
    campoBusca.addEventListener("input", (e) => renderizarVitrine(e.target.value));
  }

  // --- RENDERIZAR PÁGINA INDIVIDUAL DO PRODUTO (PRODUTO.HTML / PDP) ---
  const pdpContainer = document.getElementById("detalhe-produto-container");
  if (pdpContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const prodId = urlParams.get("id");
    const produto = dadosProdutos[prodId];

    if (produto) {
      pdpContainer.innerHTML = `
        <div class="pdp-grid">
          <div class="pdp-imagem">
            <img src="${produto.imagem}" alt="${produto.nome}">
          </div>
          <div class="pdp-info">
            <h2>${produto.nome}</h2>
            <p class="pdp-descricao">${produto.descricao}</p>
            
            <div class="form-group">
              <label for="pdp-numeral">Escolha a Numeração:</label>
              <select id="pdp-numeral">
                ${Object.keys(produto.medidas).map(num => `
                  <option value="${num}">Tamanho ${num} - ${formatarMoeda(produto.medidas[num].preco)}</option>
                `).join('')}
              </select>
            </div>

            <div id="pdp-specs" class="product-specs-card"></div>

            <button id="btn-add-pdp" class="btn-primary" style="width: 100%; margin-top: 15px;">
              ➕ Adicionar ao Carrinho
            </button>
          </div>
        </div>
      `;

      const selectNum = document.getElementById("pdp-numeral");
      const specsDiv = document.getElementById("pdp-specs");

      function atualizarSpecsPDP() {
        const num = selectNum.value;
        const det = produto.medidas[num];
        specsDiv.innerHTML = `
          <p><strong>Numeração selecionada:</strong> ${det.num}</p>
          <p><strong>Peso estimado do par:</strong> ${(det.peso * 1000).toFixed(0)}g</p>
          <p><strong>Garantia de Troca:</strong> Até 30 dias após o recebimento</p>
        `;
      }

      selectNum.addEventListener("change", atualizarSpecsPDP);
      atualizarSpecsPDP();

      document.getElementById("btn-add-pdp").addEventListener("click", () => {
        const num = selectNum.value;
        const det = produto.medidas[num];

        carrinho.push({
          id: Date.now(),
          nome: produto.nome,
          numeral: det.num,
          preco: det.preco,
          peso: det.peso
        });

        salvarCarrinho();
        abrirCarrinho();
      });
    } else {
      pdpContainer.innerHTML = `<p>Calçado não encontrado na coleção.</p>`;
    }
  }

  // CHECKOUT WHATSAPP
  if (formCheckout) {
    formCheckout.addEventListener("submit", (e) => {
      e.preventDefault();

      if (carrinho.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
      }

      if (!dadosEntrega) {
        alert("Informe seu CEP e clique em 'Calcular' antes de finalizar.");
        return;
      }

      const whatsappCliente = inputWhatsapp.value;
      const formaPagamento = selectPagamento.value;
      const subtotal = carrinho.reduce((sum, item) => sum + item.preco, 0);
      const numeroLoja = "5582999999999"; 

      const listaItensTexto = carrinho.map((item, idx) => 
        `${idx + 1}. *${item.nome}*\n   👠 Tam: ${item.numeral} | Valor: ${formatarMoeda(item.preco)}`
      ).join('\n\n');

      const mensagem = 
`🛍️ *NOVO PEDIDO - GRACIOSA CALÇADOS*
----------------------------------------
📦 *ITENS SOLICITADOS:*

${listaItensTexto}

----------------------------------------
📍 *ENTREGA:*
- *Cidade/UF:* ${dadosEntrega.cidade} - ${dadosEntrega.uf}
- *Bairro:* ${dadosEntrega.bairro || 'Não informado'}
- *Prazo Estimado:* ${dadosEntrega.prazo}

💰 *RESUMO FINANCEIRO:*
- Subtotal: ${formatarMoeda(subtotal)}
- Frete: ${formatarMoeda(valorFrete)}
- *TOTAL:* ${formatarMoeda(subtotal + valorFrete)}

💳 *Forma de Pagamento:* ${formaPagamento}
📱 *Contato do Cliente:* ${whatsappCliente}
----------------------------------------`;

      const urlWhatsapp = `https://wa.me/${numeroLoja}?text=${encodeURIComponent(mensagem)}`;
      window.open(urlWhatsapp, "_blank");
    });
  }

  // Inicialização
  renderizarVitrine();
  renderizarCarrinho();
  atualizarContador();
});


