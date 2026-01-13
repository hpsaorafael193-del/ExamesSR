 /**
 * © 2026 Luidhy Conceição dos Santos
 * Custom Restricted License
 * Usage restricted to the author and the original RP medical group.
 * Unauthorized use or modification is prohibited.
 */

// ===============================
// MODELS.JS - Fonte única de dados do sistema
// ===============================

// Estado global (MANTIDO)
const ExamesData = {
    exames: [],
    categorias: []
};

// ===============================
// NORMALIZAÇÃO DE CATEGORIA (NOVO)
// ===============================
function normalizarCategoria(valor) {
    if (!valor) return 'sem-categoria';

    return valor
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");
}

// ===============================
// Classe de modelo (MANTIDA)
// ===============================
class ExameModel {
    static getExameById(id) {
        return ExamesData.exames.find(e => e.id === id);
    }

    static getExamesByCategoria(categoria) {
        if (categoria === 'todos') return ExamesData.exames;
        return ExamesData.exames.filter(e => e.categoria === categoria);
    }

    static searchExames(query) {
        const q = query.toLowerCase();
        return ExamesData.exames.filter(e =>
            e.nome.toLowerCase().includes(q) ||
            e.descricao.toLowerCase().includes(q)
        );
    }
}

// ==================================================
// CONFIGURAÇÃO DE CATEGORIAS PADRÃO (MANTIDA)
// ==================================================
const defaultCategorias = [
    { id: 'laboratorio', nome: 'Laboratório Clínico', icone: 'fa-flask', ordem: 1 },
    { id: 'cardiologia', nome: 'Cardiologia', icone: 'fa-heartbeat', ordem: 2 },
    { id: 'radiologia', nome: 'Radiologia', icone: 'fa-x-ray', ordem: 3 },
    { id: 'ginecologia', nome: 'Ginecologia', icone: 'fa-female', ordem: 4 },
    { id: 'pediatria', nome: 'Pediatria', icone: 'fa-baby', ordem: 5 },
    { id: 'generico', nome: 'Genérico', icone: 'fa-file-medical', ordem: 99 }
];

// ==================================================
// Exames fallback (MANTIDO)
// ==================================================
const defaultExames = [
    {
        id: 'modelo_generico',
        nome: 'Laudo Genérico',
        descricao: 'Modelo de laudo genérico',
        categoria: 'generico',
        icone: 'fa-file-medical',
        campos: [
            { id: "descricao", tipo: "textarea", label: "Descrição", placeholder: "Descrição do caso..." },
            { id: "achados", tipo: "textarea", label: "Achados", placeholder: "Achados principais..." },
            { id: "discussao", tipo: "textarea", label: "Discussão", placeholder: "Discussão do caso..." },
            { id: "conclusao", tipo: "textarea", label: "Conclusão", placeholder: "Conclusão final..." }
        ]
    }
];

// ==================================================
// UNIFICAÇÃO JSON + FALLBACK (AJUSTADA)
// Categorias agora são GERADAS automaticamente
// ==================================================
async function initExamesData() {
    try {
        console.log('🔍 Iniciando carregamento de exames...');

        const response = await fetch('assets/exames.json');
        if (!response.ok) throw new Error('JSON não encontrado');

        const data = await response.json();

        // 🔹 exames continuam vindo do JSON ou fallback
        const exames = Array.isArray(data.exames) && data.exames.length
            ? data.exames
            : defaultExames;

        ExamesData.exames = [];
        ExamesData.categorias = [];

        // 🔹 categorias passam a ser derivadas dos exames
        exames.forEach(exame => {
            const categoriaId = normalizarCategoria(exame.categoria);

            // cria categoria automaticamente se não existir
            if (!ExamesData.categorias.find(c => c.id === categoriaId)) {
                const categoriaPadrao = defaultCategorias.find(c => c.id === categoriaId);

                ExamesData.categorias.push({
                    id: categoriaId,
                    nome: categoriaPadrao?.nome || exame.categoria || 'Sem Categoria',
                    icone: categoriaPadrao?.icone || 'fa-folder',
                    ordem: categoriaPadrao?.ordem || 99
                });
            }

            // normaliza a categoria no exame
            ExamesData.exames.push({
                ...exame,
                categoria: categoriaId
            });
        });

        // 🔹 ordenação mantida
        ExamesData.categorias.sort(
            (a, b) => (a.ordem || 99) - (b.ordem || 99)
        );

        console.log(`✅ ${ExamesData.exames.length} exames carregados`);
        console.log(`✅ ${ExamesData.categorias.length} categorias geradas automaticamente`);

    } catch (err) {
        console.warn('⚠️ Erro ao carregar JSON, usando fallback completo:', err.message);

        ExamesData.exames = defaultExames;
        ExamesData.categorias = defaultCategorias;
    }
}

// ===============================
// Inicialização (MANTIDA)
// ===============================
initExamesData();

// ===============================
// Exportação global (MANTIDA)
// ===============================
window.ExamesData = ExamesData;
window.ExameModel = ExameModel;
