const csvUrl = '/Exportar_Equipamento_20260331.csv';
let inventory = [];
let currentFilterCategory = '';

const formatText = (t) => (t || '').toLowerCase();

const parseCsv = (text) => {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(1).map((line) => {
    const [rawName = '', rawPath = ''] = line.split(';');
    const path = rawPath.trim();
    const pathParts = path.split('/').map((p) => p.trim()).filter(Boolean);
    return {
      name: rawName.trim(),
      path,
      category: pathParts[0] || 'Outros',
      subcategory: pathParts[1] || 'Sem subcategoria',
      fullCategory: path || 'Sem categoria',
    };
  }).filter((item) => item.name);
};

const groupByCategory = (items) => {
  return items.reduce((acc, item) => {
    const cat = item.category || 'Outros';
    const sub = item.subcategory || 'Sem subcategoria';
    acc[cat] = acc[cat] || {};
    acc[cat][sub] = acc[cat][sub] || [];
    acc[cat][sub].push(item);
    return acc;
  }, {});
};

const cardHtml = (item) => `
  <article class="card-hover bg-gray-900 p-6 rounded-3xl border border-white/10 shadow-lg">
    <h3 class="text-xl font-semibold mb-2">${item.name}</h3>
    <p class="text-gray-300 text-sm mb-3">${item.fullCategory}</p>
    <p class="text-green-400 font-medium mb-3">Disponível: em stock</p>
    <a href="https://wa.me/351965717720" class="text-green-400 underline">Pedir info</a>
  </article>`;

const getActiveCategory = () => {
  const categorySelect = document.getElementById('equip-category');
  if (categorySelect && categorySelect.value) {
    return categorySelect.value;
  }
  return currentFilterCategory || '';
};

const renderInventory = (filterCategory = '') => {
  const activeCategory = filterCategory || getActiveCategory();
  currentFilterCategory = activeCategory;

  const grid = document.getElementById('equip-grid');
  const count = document.getElementById('equip-count');
  const query = formatText(document.getElementById('equip-search').value || '');

  const filtered = inventory.filter((item) => {
    const matchesCategory = !activeCategory || item.category === activeCategory;
    const matchesSearch = !query || formatText(item.name).includes(query) || formatText(item.fullCategory).includes(query);
    return matchesCategory && matchesSearch;
  });

  count.textContent = `${filtered.length} itens encontrados de ${inventory.length}`;

  if (!filtered.length) {
    grid.innerHTML = '<p class="text-gray-300 col-span-full">Nenhum item encontrado. Tente outro filtro.</p>';
    return;
  }

  const grouped = groupByCategory(filtered);
  const categories = Object.keys(grouped).sort();

  grid.innerHTML = categories.map((category) => {
    const subcategories = Object.keys(grouped[category]).sort();
    const categoryTotal = subcategories.reduce((sum, sub) => sum + grouped[category][sub].length, 0);
    return `
      <section class="col-span-full">
        <div class="mb-4">
          <h3 class="text-2xl font-bold text-green-300">${category} (${categoryTotal})</h3>
        </div>
        ${subcategories.map((subcategory) => `
          <div class="mb-8">
            <h4 class="text-xl font-semibold text-gray-200 mb-3">${subcategory} (${grouped[category][subcategory].length})</h4>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-2">
              ${grouped[category][subcategory].map(cardHtml).join('')}
            </div>
          </div>
        `).join('')}
      </section>
    `;
  }).join('');
};

const populateCategories = () => {
  const categorySelect = document.getElementById('equip-category');
  const categories = [...new Set(inventory.map((item) => item.category))].sort();
  categorySelect.innerHTML = '<option value="">Todas as categorias</option>' + categories.map((cat) => `<option value="${cat}">${cat}</option>`).join('');
  if (currentFilterCategory && categories.includes(currentFilterCategory)) {
    categorySelect.value = currentFilterCategory;
  }
};

const setupSearch = () => {
  const searchInput = document.getElementById('equip-search');
  const categorySelect = document.getElementById('equip-category');

  const getActiveCategory = () => categorySelect.value || currentFilterCategory || '';

  searchInput.addEventListener('input', () => renderInventory(getActiveCategory()));
  categorySelect.addEventListener('change', (event) => {
    currentFilterCategory = event.target.value || '';
    renderInventory(getActiveCategory());
  });
};

const loadInventory = async (filterCategory = '') => {
  currentFilterCategory = filterCategory;
  try {
    const response = await fetch(csvUrl);
    const text = await response.text();
    inventory = parseCsv(text);
    populateCategories();
    renderInventory(currentFilterCategory);
    setupSearch();
  } catch (error) {
    document.getElementById('equip-count').textContent = 'Erro ao carregar inventário.';
    document.getElementById('equip-grid').innerHTML = '<p class="text-red-400">Não foi possível carregar o inventário.</p>';
    console.error(error);
  }
};

window.initializeEquipment = (filterCategory = '') => {
  document.addEventListener('DOMContentLoaded', () => {
    loadInventory(filterCategory);
  });
};