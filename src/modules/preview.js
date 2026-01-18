// Renderização do preview do laudo
class Preview {
  constructor(app) {
    this.app = app;
  }

  update() {
    this.renderAllPages();
    this.app.draftManager.saveDraft();
  }

  renderAllPages() {
    const container = document.querySelector(".laudo-preview-container");
    const previewContainer = container?.querySelector(".laudo-preview");
    if (!previewContainer) return;

    const paginaAnterior = this.app.state.paginaAtual;
    previewContainer.innerHTML = "";

    this.renderMainPage(previewContainer);
    this.renderTechnicalPage(previewContainer);
    this.renderAttachmentPages(previewContainer);

    const totalPages = this.app.pagination.getTotalPages();
    this.app.state.paginaAtual = Math.min(paginaAnterior, totalPages - 1);

    requestAnimationFrame(() => {
      this.app.pagination.renderCurrentPage();
    });
  }

  /* ===============================
     PÁGINA 1 — CLÍNICA
  =============================== */
  renderMainPage(container) {
    const pagina = document.createElement("div");
    pagina.className = "laudo-pagina";
    pagina.id = "laudo-pagina-0";
    pagina.dataset.pageIndex = 0;

    const documentoTipo =
      document.getElementById("documento-tipo")?.value || "Passaporte";

    const documentoCompleto = this.app.state.paciente.documento
      ? `${documentoTipo}: ${this.app.state.paciente.documento}`
      : "-";

    const idadeCompleta = this.app.state.paciente.idade
      ? `${this.app.state.paciente.idade} anos`
      : "-";

    const numeroExame = document.getElementById("numero-exame")?.value || "-";

    const dataExame = document.getElementById("data-exame")?.value;
    const horaExame = document.getElementById("hora-exame")?.value;

    const dataHora = dataExame
      ? `${dataExame}${horaExame ? ` às ${horaExame}` : ""}`
      : "-";

    const registroProfissional = this.app.state.profissional.registro
      ? `CRM: ${this.app.state.profissional.registro}`
      : "Registro Profissional";

    pagina.innerHTML = `
      <header class="laudo-header">
        <div class="laudo-logo">
          <div class="hospital-logo-img">
            <img src="assets/logo.png" alt="Hospital São Rafael">
          </div>
          <div class="laudo-titulo">
            <h1>HOSPITAL SÃO RAFAEL</h1>
            <p class="laudo-subtitulo">Núcleo Integrado de Diagnóstico Laboratorial</p>
          </div>
        </div>
      </header>

      <div class="laudo-divider"></div>

      <section class="laudo-section">
        <h2 class="laudo-section-title">
          <i class="fas fa-user-injured"></i> DADOS DO PACIENTE
        </h2>

        <div class="laudo-grid">
          <div class="laudo-field">
            <span class="field-label">Nome:</span>
            <span class="field-value">${this.app.state.paciente.nome || "-"}</span>
          </div>
          <div class="laudo-field">
            <span class="field-label">Documento:</span>
            <span class="field-value">${documentoCompleto}</span>
          </div>
          <div class="laudo-field">
            <span class="field-label">Idade:</span>
            <span class="field-value">${idadeCompleta}</span>
          </div>
          <div class="laudo-field">
            <span class="field-label">Tipo Sanguíneo:</span>
            <span class="field-value">${this.app.state.paciente.tipoSanguineo || "-"}</span>
          </div>
        </div>
      </section>

      <section class="laudo-section">
        <h2 class="laudo-section-title">
          <i class="fas fa-notes-medical"></i> RESUMO CLÍNICO
        </h2>

        <div class="exame-info">
          <h3>${this.app.state.exameAtual?.nome || "Exame não selecionado"}</h3>
          <p>${this.app.state.exameAtual?.descricao || ""}</p>
        </div>

        <div class="observacoes-container">
          ${this.generateExameObservacoesHTML()}
        </div>
      </section>

      <footer class="laudo-footer">
        <div class="laudo-divider"></div>

        <div class="assinatura-container">
          <div class="assinatura-preview-footer">
            ${
              this.app.state.assinatura?.data
                ? `<img src="${this.app.state.assinatura.data}" alt="Assinatura">`
                : `<div class="assinatura-placeholder">
                    <i class="fas fa-signature"></i>
                    <p>Assinatura não disponível</p>
                  </div>`
            }
          </div>

          <div class="profissional-info">
            <div class="profissional-nome">
              ${this.app.state.profissional.nome || "________________________________"}
            </div>
            <div class="profissional-registro">${registroProfissional}</div>
            <div class="profissional-registro">${dataHora}</div>
          </div>
        </div>

        <div class="laudo-rodape">
          <p class="laudo-aviso">Número do Laudo: ${numeroExame}</p>
        </div>
      </footer>
    `;

    container.appendChild(pagina);
  }

  /* ===============================
     PÁGINA 2 — TÉCNICA
  =============================== */
  renderTechnicalPage(container) {
    if (!this.app.state.exameAtual) return;

    const camposTecnicos = this.app.state.exameAtual.campos
      .filter(campo => !this.isCampoClinico(campo));

    if (!camposTecnicos.length) return;

    const pagina = document.createElement("div");
    pagina.className = "laudo-pagina";
    pagina.id = "laudo-pagina-1";
    pagina.dataset.pageIndex = 1;

    pagina.innerHTML = `
      <header class="laudo-header">
        <div class="laudo-logo">
          <div class="hospital-logo-img">
            <img src="assets/logo.png" alt="Hospital São Rafael">
          </div>
          <div class="laudo-titulo">
            <h1>HOSPITAL SÃO RAFAEL</h1>
            <p class="laudo-subtitulo">
              Resultados Técnicos — ${this.app.state.exameAtual.nome}
            </p>
          </div>
        </div>
      </header>

      <div class="laudo-divider"></div>

      <section class="laudo-section">
        <h2 class="laudo-section-title">
          <i class="fas fa-vials"></i> RESULTADOS DO EXAME
        </h2>

        <div class="resultados-container">
          ${
            this.isExameTabular(camposTecnicos)
              ? this.generateExameResultsHTML(camposTecnicos)
              : this.generateBlocosTecnicos(camposTecnicos)
          }
        </div>
      </section>
    `;

    container.appendChild(pagina);
  }

  /* ===============================
     RESULTADOS TÉCNICOS (TABELA)
  =============================== */
  generateExameResultsHTML(camposTecnicos) {
    if (!camposTecnicos || !camposTecnicos.length) {
      return `<p class="sem-resultados">Nenhum dado técnico registrado.</p>`;
    }

    const linhas = camposTecnicos.map(campo => {
      const valor = this.app.state.dadosExame[campo.id];
      const valorExibido = valor !== undefined && valor !== "" ? valor : "—";

      let referencia = "—";
      if (campo.referencia) {
        referencia = campo.referencia;
      } else if (Array.isArray(campo.valoresPermitidos)) {
        referencia = campo.valoresPermitidos.join(" / ");
      }

      return `
        <tr>
          <td>${campo.label}</td>
          <td>${valorExibido}${campo.unidade ? " " + campo.unidade : ""}</td>
          <td>${referencia}</td>
        </tr>
      `;
    }).join("");

    return `
      <table class="tabela-resultados">
        <thead>
          <tr>
            <th>Parâmetro</th>
            <th>Resultado</th>
            <th>Referência</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    `;
  }

  /* ===============================
     RESULTADOS TÉCNICOS (BLOCOS)
  =============================== */
  generateBlocosTecnicos(campos) {
    return campos.map(campo => {
      const valor = this.app.state.dadosExame[campo.id] || "—";
      return `
        <div class="bloco-tecnico">
          <div class="bloco-tecnico-titulo">${campo.label}</div>
          <div class="bloco-tecnico-conteudo">${valor}</div>
        </div>
      `;
    }).join("");
  }

  /* ===============================
     OBSERVAÇÕES (CLÍNICA)
  =============================== */
  generateExameObservacoesHTML() {
    if (!this.app.state.exameAtual?.campos) return "";

    return this.app.state.exameAtual.campos
      .filter(campo => this.isCampoClinico(campo))
      .map(campo => {
        const valor = this.app.state.dadosExame[campo.id];
        if (!valor) return "";
        return `
          <div class="observacao-title">
            <i class="fas fa-notes-medical"></i> ${campo.label}
          </div>
          <div class="observacao-text">${valor}</div>
        `;
      })
      .join("");
  }

  /* ===============================
     ANEXOS (INALTERADO)
  =============================== */
  renderAttachmentPages(container) {
    this.app.state.anexos.forEach((anexo, index) => {
      const pageIndex = index + 2;

      const pagina = document.createElement("div");
      pagina.className = "laudo-pagina";
      pagina.id = `laudo-pagina-${pageIndex}`;
      pagina.dataset.pageIndex = pageIndex;

      pagina.innerHTML = `
        <header class="laudo-header">
          <div class="laudo-logo">
            <div class="hospital-logo-img">
              <img src="assets/logo.png" alt="Hospital São Rafael">
            </div>
            <div class="laudo-titulo">
              <h1>HOSPITAL SÃO RAFAEL</h1>
              <p class="laudo-subtitulo">Anexo do Laudo</p>
            </div>
          </div>
        </header>

        <div class="laudo-divider"></div>

        <div class="anexos-content">
          <div class="anexo-pagina-item">
            <div class="anexo-pagina-titulo">
              <i class="fas fa-paperclip"></i> ${anexo.name}
            </div>
            <div class="anexo-pagina-imagem">
              <img src="${anexo.data}" alt="${anexo.name}">
            </div>
          </div>
        </div>
      `;

      container.appendChild(pagina);
    });
  }

  /* ===============================
     UTILITÁRIOS
  =============================== */
  isCampoClinico(campo) {
    if (campo.tipo !== "textarea") return false;

    const id = (campo.id || "").toLowerCase();
    const label = (campo.label || "").toLowerCase();

    return (
      id.includes("conclus") ||
      id.includes("interpreta") ||
      label.includes("conclus") ||
      label.includes("interpreta")
    );
  }

  isExameTabular(camposTecnicos) {
    return camposTecnicos.some(
      campo => campo.unidade || campo.referencia
    );
  }
}
