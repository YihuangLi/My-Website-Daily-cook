const SUPABASE_URL = "https://tvqvqhsfvyczzirbkwcn.supabase.co";
const SUPABASE_KEY = "sb_publishable_h2b6rF43Bb8qeqKmtW6-pQ_6fWr-cUX";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let recipes = [];
let current = null;
const $ = id => document.getElementById(id);

// 监听登录状态
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (session) {
    $("authContainer").style.display = "none";
    fetchRecipes();
  } else {
    $("authContainer").style.display = "block";
  }
});

// 登录与注册按钮事件
$("loginBtn").onclick = async () => {
  const email = $("authEmail").value;
  const password = $("authPassword").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) alert(error.message);
};

$("signUpBtn").onclick = async () => {
  const email = $("authEmail").value;
  const password = $("authPassword").value;
  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) alert(error.message);
  else alert("Check your email for confirmation link!");
};

// 从云端拉取菜谱数据
async function fetchRecipes() {
  const { data, error } = await supabaseClient.from('recipes').select('*');
  if (!error) {
    recipes = data || [];
    render();
  }
}

function render() {
  $("count").textContent = recipes.length;
  $("recent").textContent = recipes.filter(r => r.lastPicked).length;

  const list = $("recipeList");

  if (!recipes.length) {
    list.innerHTML = `
      <div class="empty" style="grid-column:1/-1">
        No recipes yet
        <br>
        Click “＋ Add” in the top right to get started
      </div>
    `;
    return;
  }

  list.innerHTML = recipes.map(r => `
    <div class="card" data-id="${r.id}">
      ${
        r.image
          ? `<img src="${r.image}">`
          : '<div class="placeholder">🍳</div>'
      }
      <div class="card-body">
        <h3>${esc(r.name)}</h3>
        <p>${esc(r.category)} · ${esc(r.minutes || "?")} min</p>
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".card").forEach(c => {
    c.onclick = () => showDetail(c.dataset.id);
  });
}

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function page(id) {
  document.querySelectorAll(".page").forEach(p => {
    p.classList.toggle("active", p.id === id);
  });

  document.querySelectorAll(".nav").forEach(n => {
    n.classList.toggle("active", n.dataset.page === id);
  });
}

document.querySelectorAll("[data-page]").forEach(b => {
  b.onclick = () => page(b.dataset.page);
});

$("drawBtn").onclick = draw;
$("againBtn").onclick = draw;
$("detailBtn").onclick = () => current && showDetail(current.id);

function draw() {
  if (!recipes.length) {
    alert("Please add at least one recipe first.");
    page("recipes");
    return;
  }

  $("dice").classList.add("rolling");
  $("drawBtn").disabled = true;

  const pool = recipes.length > 2
    ? recipes.filter(r => !r.lastPicked)
    : recipes;

  const chosen =
    pool[Math.floor(Math.random() * pool.length)] || recipes[0];

  setTimeout(() => {
    recipes.forEach(r => r.lastPicked = false);
    chosen.lastPicked = true;
    current = chosen;

    localStorage.setItem(KEY, JSON.stringify(recipes));

    $("dice").classList.remove("rolling");
    $("drawBtn").disabled = false;
    $("result").innerHTML = `<span>${esc(chosen.name)}</span>`;
    $("againBtn").classList.remove("hidden");
    $("detailBtn").classList.remove("hidden");

    render();
  }, 900);
}

function showDetail(id) {
  current = recipes.find(r => r.id === id);
  if (!current) return;

  const r = current;

  const ing = esc(r.ingredients || "")
    .split("\n")
    .filter(Boolean)
    .map(x => `<li>${x}</li>`)
    .join("");

  const steps = esc(r.steps || "")
    .split("\n")
    .filter(Boolean)
    .map(x => `<li>${x.replace(/^\d+[.、]\s*/, "")}</li>`)
    .join("");

  $("detailContent").innerHTML = `
    <div class="detail-card">
      ${
        r.image
          ? `<img src="${r.image}">`
          : '<div class="placeholder" style="height:220px">🍳</div>'
      }
      <div class="detail-body">
        <h2>${esc(r.name)}</h2>
        <span class="tag">
          ${esc(r.category)} · ${esc(r.minutes || "?")} min
        </span>

        <h3>Ingredients</h3>
        <ul>${ing || "<li>No ingredients added yet.</li>"}</ul>

        <h3>Instructions</h3>
        <ol>${steps || "<li>No instructions added yet.</li>"}</ol>

        <button
          class="secondary"
          id="deleteBtn"
          style="margin-top:15px"
        >
          Delete this recipe
        </button>
      </div>
    </div>
  `;

  $("deleteBtn").onclick = () => {
    if (confirm("Are you sure you want to delete this recipe?")) {
      recipes = recipes.filter(x => x.id !== r.id);
      save();
      page("recipes");
    }
  };

  page("detail");
}

$("addBtn").onclick = () => {
  $("modal").classList.remove("hidden");
};

$("closeModal").onclick = () => {
  $("modal").classList.add("hidden");
};

$("saveBtn").onclick = () => {
  const name = $("name").value.trim();

  if (!name) {
    alert("Please enter a recipe name.");
    return;
  }

  const file = $("image").files[0];

  const finish = image => {
    recipes.unshift({
      id: Date.now().toString(),
      name,
      category: $("category").value,
      minutes: $("minutes").value,
      ingredients: $("ingredients").value,
      steps: $("steps").value,
      image
    });

    save();
    $("modal").classList.add("hidden");

    ["name", "minutes", "ingredients", "steps", "image"].forEach(id => {
      $(id).value = "";
    });
  };

  if (file) {
    const rd = new FileReader();
    rd.onload = e => finish(e.target.result);
    rd.readAsDataURL(file);
  } else {
    finish("");
  }
};

render();
