import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_BASE_URL = "https://product-browser-backend.vercel.app";
const CATEGORIES = [
  "Electronics",
  "Books",
  "Fashion",
  "Shoes",
  "Sports",
  "Home",
  "Kitchen",
  "Gaming",
  "Health",
  "Beauty",
];

function App() {
  const [products, setProducts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [panelMode, setPanelMode] = useState(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationMessage, setMutationMessage] = useState("");
  const [editingUniqueId, setEditingUniqueId] = useState("");
  const updatePanelRef = useRef(null);
  const [formData, setFormData] = useState({
    unique_id: "",
    name: "",
    price: "",
    category: CATEGORIES[0],
  });

  const summary = useMemo(() => {
    const currency = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
    return products
      .filter((product) =>
        selectedCategory && selectedCategory !== "All"
          ? product.category === selectedCategory
          : true,
      )
      .map((product) => ({
        ...product,
        formattedPrice: currency.format(Number(product.price) || 0),
        formattedDate: product.created_at
          ? new Date(product.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "Unknown date",
      }));
  }, [products, selectedCategory]);

  const fetchProducts = useCallback(
    async (cursor = null, category = selectedCategory) => {
      const params = new URLSearchParams({ limit: "12" });

      if (cursor) {
        params.set("cursor", cursor);
      }

      if (category && category !== "All") {
        params.set("category", category);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/product?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to load products (${response.status})`);
      }

      return response.json();
    },
    [selectedCategory],
  );

  const loadProducts = async (
    cursor = null,
    append = false,
    category = selectedCategory,
  ) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError("");
    }

    try {
      const data = await fetchProducts(cursor, category);

      setProducts((currentProducts) =>
        append
          ? [...currentProducts, ...(data.products ?? [])]
          : (data.products ?? []),
      );
      setNextCursor(data.nextCursor ?? null);
      setLastUpdated(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load products",
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const refreshProducts = async () => {
    setNextCursor(null);
    await loadProducts(null, false, selectedCategory);
  };

  const openAddPanel = () => {
    setPanelMode("add");
    setMutationMessage("");
    setEditingUniqueId("");
    setFormData({
      unique_id: "",
      name: "",
      price: "",
      category: CATEGORIES[0],
    });
  };

  const openUpdatePanel = (product = null) => {
    setPanelMode("update");
    setMutationMessage("");
    setEditingUniqueId(product?.unique_id ?? "");
    setFormData({
      unique_id: product?.unique_id ?? "",
      name: product?.name ?? "",
      price: product?.price ?? "",
      category: product?.category ?? CATEGORIES[0],
    });
  };

  const closePanel = () => {
    setPanelMode(null);
    setMutationMessage("");
    setEditingUniqueId("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    setMutationLoading(true);
    setMutationMessage("");
    setError("");

    const payload = {
      unique_id: formData.unique_id.trim(),
      name: formData.name.trim(),
      price: Number(formData.price),
      category: formData.category,
    };

    if (panelMode === "update") {
      payload.original_unique_id = editingUniqueId;
    }

    try {
      const endpoint = panelMode === "add" ? "/api/product" : "/api/product";
      const method = panelMode === "add" ? "POST" : "PATCH";

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to save product");
      }

      setMutationMessage(data.message ?? "Product saved successfully");
      await loadProducts(null, false, selectedCategory);
      setPanelMode(null);
      setEditingUniqueId("");
    } catch (submitError) {
      setMutationMessage(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save product",
      );
    } finally {
      setMutationLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadInitialProducts = async () => {
      try {
        const data = await fetchProducts();

        if (ignore) {
          return;
        }

        setProducts(data.products ?? []);
        setNextCursor(data.nextCursor ?? null);
        setLastUpdated(
          new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      } catch (fetchError) {
        if (!ignore) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load products",
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadInitialProducts();

    return () => {
      ignore = true;
    };
  }, [fetchProducts]);

  useEffect(() => {
    if (panelMode !== "update" || !updatePanelRef.current) {
      return;
    }

    updatePanelRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [panelMode]);

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Backend product browser</p>
          <h1>Simple storefront data view</h1>
          <p className="hero-text">
            A minimal Vite interface that reads from the backend API and shows
            the latest products in a clean, scan-friendly layout.
          </p>
          <div className="hero-meta">
            <span>API: {API_BASE_URL}</span>
            <span>{products.length} products loaded</span>
            <span>Category: {selectedCategory}</span>
            <span>
              {lastUpdated ? `Updated ${lastUpdated}` : "Waiting for data"}
            </span>
          </div>
        </div>

        <div className="hero-actions">
          <button
            type="button"
            className="refresh-button"
            onClick={refreshProducts}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh products"}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={openAddPanel}
          >
            Add product
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => openUpdatePanel(summary[0] ?? null)}
          >
            Update product
          </button>
        </div>
      </section>

      <section className="filter-panel" aria-label="Filters">
        <div>
          <p className="filter-label">Category filter</p>
          <p className="filter-help">
            Filter the product list by one category or show everything.
          </p>
        </div>
        <select
          className="category-select"
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
        >
          <option value="All">All</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </section>

      {panelMode ? (
        <section
          className="form-panel"
          aria-label="Product form"
          ref={updatePanelRef}
        >
          <div className="form-panel-header">
            <div>
              <p className="filter-label">
                {panelMode === "add" ? "Add product" : "Update product"}
              </p>
              <p className="filter-help">
                {panelMode === "add"
                  ? "Create a new product entry in the backend."
                  : "Edit an existing product by unique id."}
              </p>
            </div>
            <button type="button" className="ghost-button" onClick={closePanel}>
              Close
            </button>
          </div>

          <form className="product-form" onSubmit={submitProduct}>
            <label>
              <span>Unique ID</span>
              <input
                name="unique_id"
                value={formData.unique_id}
                onChange={handleFormChange}
                placeholder="PROD-001"
                required
                disabled={mutationLoading}
              />
            </label>
            <label>
              <span>Name</span>
              <input
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="Product name"
                required
                disabled={mutationLoading}
              />
            </label>
            <label>
              <span>Price</span>
              <input
                name="price"
                type="number"
                min="1"
                value={formData.price}
                onChange={handleFormChange}
                placeholder="4999"
                required
                disabled={mutationLoading}
              />
            </label>
            <label>
              <span>Category</span>
              <select
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                disabled={mutationLoading}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-actions">
              <button
                type="submit"
                className="refresh-button"
                disabled={mutationLoading}
              >
                {mutationLoading
                  ? panelMode === "add"
                    ? "Adding..."
                    : "Updating..."
                  : panelMode === "add"
                    ? "Add product"
                    : "Update product"}
              </button>
            </div>
          </form>
          {mutationMessage ? (
            <div className="status-card form-status">{mutationMessage}</div>
          ) : null}
        </section>
      ) : null}

      {error ? <div className="status-card error-card">{error}</div> : null}

      <section className="products-section" aria-label="Products">
        {loading ? (
          <div className="status-card">
            Loading products from the backend...
          </div>
        ) : summary.length === 0 ? (
          <div className="status-card">
            No products found. Add sample products in the backend first.
          </div>
        ) : (
          <>
            <div className="products-grid">
              {summary.map((product) => (
                <article key={product.unique_id} className="product-card">
                  <div className="product-card-top">
                    <span className="category-pill">{product.category}</span>
                    <span className="product-id">{product.unique_id}</span>
                  </div>
                  <h2>{product.name}</h2>
                  <p className="price">{product.formattedPrice}</p>
                  <p className="product-date">
                    Created {product.formattedDate}
                  </p>
                  <button
                    type="button"
                    className="card-update-button"
                    onClick={() => openUpdatePanel(product)}
                  >
                    Update this product
                  </button>
                </article>
              ))}
            </div>

            <div className="footer-actions">
              <button
                type="button"
                className="load-more-button"
                onClick={() => loadProducts(nextCursor, true)}
                disabled={!nextCursor || loadingMore}
              >
                {loadingMore
                  ? "Loading more..."
                  : nextCursor
                    ? "Load more"
                    : "No more products"}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default App;
