'use strict';
// Cliente de la API de Nibiru (catalogo ITpro).

function norm(p, campoCosto) {
  const costo = Number(p[campoCosto] != null ? p[campoCosto] : p.price) || 0;
  return {
    sku: p.sku,
    titulo: String(p.title || '').trim(),
    costo,
    precioLista: Number(p.final_price) || null,
    stock: Number(p.stock) || 0,
    proveedor: p.proveedor || '',
    descripcion: String(p.description || ''),
    imagen: p.image_url || p.image_small || '',
    url: p.product_url || '',
    moneda: p.currency || 'USD',
  };
}

/** Limpia HTML de la descripcion y la deja en texto corto. */
function textoPlano(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aacute;/gi, 'á').replace(/&eacute;/gi, 'é').replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó').replace(/&uacute;/gi, 'ú').replace(/&ntilde;/gi, 'ñ')
    .replace(/&Aacute;/g, 'Á').replace(/&Eacute;/g, 'É').replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó').replace(/&Uacute;/g, 'Ú').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&ordm;/gi, 'º').replace(/&deg;/gi, '°').replace(/&mdash;/gi, '—')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function makeClient(cfg) {
  const { baseUrl, apiKey, campoCosto = 'price' } = cfg;
  const base = String(baseUrl).replace(/\/$/, '');

  async function get(path) {
    const url = base + path + (path.includes('?') ? '&' : '?') + 'apikey=' + encodeURIComponent(apiKey);
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 404) return null; // "sin resultados" es normal en esta API
    if (!res.ok) throw new Error('API ' + res.status + ' ' + res.statusText);
    return res.json();
  }

  return {
    async buscar(texto, limite = 25) {
      const q = String(texto || '').trim();
      if (!q) return [];
      const data = await get(`/api/search?name=${encodeURIComponent(q)}&include_hidden=1&providers=true&limit=${limite}`);
      if (!data || !data.products) return [];
      return data.products.map((p) => norm(p, campoCosto));
    },

    async producto(sku) {
      const data = await get(`/api/product?sku=${encodeURIComponent(sku)}&providers=true`);
      if (!data) return null;
      const p = data.product || (data.products && data.products[0]) || data;
      if (!p || !p.sku) return null;
      const item = norm(p, campoCosto);
      if (data.details) {
        item.titulo = String(data.details.title || item.titulo).trim();
        const largo = textoPlano(data.details.description || data.details.short_description || '');
        if (largo) item.descripcion = largo;
      }
      return item;
    },
  };
}

module.exports = { makeClient, textoPlano };
