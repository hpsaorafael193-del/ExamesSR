// Exportação PNG (somente página atual) - versão robusta contra canvas 0x0
class Export {
  constructor(app) {
    this.app = app;
    this.isExporting = false; // lock
    this.setupEventListeners();
  }

  setupEventListeners() {
    const btn = document.getElementById("export-png");
    if (!btn) return;

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!this.app.state.paciente.nome) {
        this.app.notification.show("Preencha o nome do paciente", "error");
        return;
      }
      if (!this.app.state.profissional.nome) {
        this.app.notification.show("Preencha o nome do profissional", "error");
        return;
      }
      if (!this.app.state.exameAtual) {
        this.app.notification.show("Selecione um exame", "error");
        return;
      }

      try {
        await this.exportLaudoPaginaAtual();
      } catch (error) {
        console.error("Erro ao exportar:", error);
        this.app.notification.show(
          "Falha ao exportar. Tente novamente.",
          "error",
        );
      }
    });
  }

  async waitForImages(root) {
    const imgs = Array.from(root.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
      }),
    );
  }

  async captureOffscreen(element, pageIndex) {
    // Wrapper fora da tela para NÃO depender do overflow/scroll do preview
    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-100000px";
    wrapper.style.top = "0";
    wrapper.style.width = "210mm";
    wrapper.style.background = "#fff";
    wrapper.style.padding = "0";
    wrapper.style.margin = "0";
    wrapper.style.zIndex = "-1";

    // Clona a página
    const clone = element.cloneNode(true);

    // Garantias de layout no clone
    clone.style.display = "block";
    clone.style.width = "210mm";
    clone.style.background = "#fff";

    // Neutraliza gradientes/patterns no clone (evita createPattern instável)
    clone.querySelectorAll(".laudo-divider").forEach((el) => {
      el.style.background = "#ddd";
    });

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      // Fontes carregadas (quando disponível)
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // Espera imagens no clone carregarem
      await this.waitForImages(clone);

      // Espera layout estabilizar
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );

      const rect = clone.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        throw new Error(`Clone está 0x0 (page ${pageIndex}).`);
      }

      const w = Math.ceil(clone.scrollWidth || rect.width);
      const h = Math.ceil(clone.scrollHeight || rect.height);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: w,
        height: h,
        windowWidth: w,
        windowHeight: h,
        scrollX: 0,
        scrollY: 0,
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas gerado sem tamanho (0x0).");
      }

      return canvas;
    } finally {
      document.body.removeChild(wrapper);
    }
  }

  async exportLaudoPaginaAtual() {
    if (this.isExporting) return;
    this.isExporting = true;

    const paginas = document.querySelectorAll(".laudo-pagina");

    try {
      if (typeof html2canvas === "undefined") {
        this.app.notification.show("Erro: html2canvas não carregado", "error");
        return;
      }

      const atual = Number(this.app.state.paginaAtual) || 0;
      const pagina = document.getElementById(`laudo-pagina-${atual}`);

      if (!pagina) {
        this.app.notification.show("Página atual não encontrada", "error");
        return;
      }

      // Garante visível (para consistência do estado e caso o clone dependa de algo)
      paginas.forEach((p) =>
        p.style.setProperty("display", "none", "important"),
      );
      pagina.style.setProperty("display", "block", "important");

      // (Opcional) traz para o viewport, ajuda em alguns casos
      pagina.scrollIntoView({ block: "start", behavior: "instant" });
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );

      this.app.notification.show("Gerando imagem da página atual...", "info");

      // ✅ captura robusta via clone offscreen
      const canvas = await this.captureOffscreen(pagina, atual);

      const nomePaciente = normalizarNomeArquivo(
        this.app.state.paciente.nome || "Paciente",
      );

      const nomeExame = normalizarNomeArquivo(
        this.app.state.exameAtual?.nome || "Exame",
      );

      const nomePagina = nomePaginaPorIndex(atual);

      const nomeArquivo = `${nomePaciente}_${nomeExame}_${nomePagina}.png`;

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.app.notification.show("✅ Página exportada com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      this.app.notification.show(
        "Falha ao exportar: " + error.message,
        "error",
      );
    } finally {
      // Restaura visibilidade para o controle de paginação
      paginas.forEach((p) => p.style.removeProperty("display"));
      this.app.pagination?.renderCurrentPage?.();
      this.isExporting = false;
    }
  }
}
function normalizarNomeArquivo(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9]+/g, "_") // troca espaços/símbolos por _
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function nomePaginaPorIndex(pageIndex) {
  if (pageIndex === 0) return "Pagina_Principal";
  if (pageIndex === 1) return "Pagina_Tecnica";
  return "Pagina_Anexo";
}
