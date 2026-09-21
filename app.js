const SUPABASE_URL = "https://tvqvqhsfvyczzirbkwcn.supabase.co";
const SUPABASE_KEY = "sb_publishable_h2b6rF43Bb8qeqKmtW6-pQ_6fWr-cUX";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let recipes = [];
let current = null;
let editingRecipeId = null;
const $ = id => document.getElementById(id);

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

async function fetchRecipes() {
  const { data, error } = await supabaseClient
    .from('recipes')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.error("Fetch recipes error:", error);
    return;
  }
  recipes = data || [];
  render();
}

function render() {
  if ($("count")) $("count").textContent = recipes.length;

  const list = $("recipeList");
  if (!list) return;

  const query = ($("searchInput")?.value || "").toLowerCase().trim();

  const filteredRecipes = recipes.filter(r => {
    const nameMatch = (r.name || "").toLowerCase().includes(query);
    const ingMatch = (r.ingredients || "").toLowerCase().includes(query);
    return nameMatch || ingMatch;
  });

  if (!filteredRecipes.length) {
    list.innerHTML = `
      <div class="empty" style="grid-column:1/-1; text-align:center; padding: 20px; color:#888;">
        ${query ? 'No matching recipes found' : 'No recipes yet. Click “＋ Add” in the top right to get started.'}
      </div>
    `;
    return;
  }

  list.innerHTML = filteredRecipes.map(r => `
    <div class="card" data-id="${r.id}">
      ${
        r.image
          ? `<img src="${r.image}">`
          : '<div class="placeholder">🍳</div>'
      }
      <div class="card-body">
        <h3>${esc(r.name)}</h3>
        <p>${esc(r.category || "General")} · ${esc(r.minutes || "?")} min</p>
        ${r.meal_types ? `<small style="color:#e67e22; display:block; margin-top:4px;">${esc(r.meal_types)}</small>` : ''}
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".card").forEach(c => {
    c.onclick = () => showDetail(c.dataset.id);
  });
}

if ($("searchInput")) {
  $("searchInput").oninput = render;
}

// 抽签（模糊匹配 meal_types）
if ($("drawBtn")) $("drawBtn").onclick = draw;
if ($("againBtn")) $("againBtn").onclick = draw;
if ($("detailBtn")) $("detailBtn").onclick = () => current && showDetail(current.id);

function draw() {
  const selectedMeal = $("drawMealFilter") ? $("drawMealFilter").value : "all";

  let pool = recipes;
  if (selectedMeal !== "all") {
    pool = recipes.filter(r => {
      if (!r.meal_types) return false;
      return r.meal_types.toLowerCase().includes(selectedMeal.toLowerCase());
    });
  }

  if (!pool.length) {
    alert(`No recipes found for "${selectedMeal}". Please edit your recipes to select this meal type!`);
    return;
  }

  $("drawBtn").disabled = true;

  const chosen = pool[Math.floor(Math.random() * pool.length)];

  setTimeout(async () => {
    current = chosen;

    $("drawBtn").disabled = false;
    $("result").innerHTML = `<span>${esc(chosen.name)}</span>`;
    $("againBtn").classList.remove("hidden");
    $("detailBtn").classList.remove("hidden");

    render();
  }, 300);
}

// 详情页
function showDetail(id) {
  current = recipes.find(r => String(r.id) === String(id));
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
    <div style="background:white; padding:20px; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
      ${
        r.image
          ? `<img src="${r.image}" style="width:100%; height:220px; object-fit:cover; border-radius:12px;">`
          : '<div class="placeholder" style="height:200px; border-radius:12px; font-size:48px;">🍳</div>'
      }
      <div style="margin-top:15px;">
        <h2>${esc(r.name)}</h2>
        <p style="color:#7f8c8d; font-size:14px; margin-top:4px;">
          ${esc(r.category || "General")} · ${esc(r.minutes || "?")} min
        </p>
        ${r.meal_types ? `<p style="margin-top: 6px; color:#e67e22; font-size:14px;"><b>Meal Types:</b> ${esc(r.meal_types)}</p>` : ''}

        <h3 style="margin-top:15px; font-size:16px;">Ingredients</h3>
        <ul style="padding-left:20px; margin-top:5px; font-size:14px;">${ing || "<li>No ingredients added.</li>"}</ul>

        <h3 style="margin-top:15px; font-size:16px;">Instructions</h3>
        <ol style="padding-left:20px; margin-top:5px; font-size:14px;">${steps || "<li>No instructions added.</li>"}</ol>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button id="editBtn" style="flex: 1;">Edit this recipe</button>
          <button class="secondary" id="deleteBtn" style="flex: 1; background: #e74c3c; color: white;">Delete</button>
        </div>
      </div>
    </div>
  `;

  // 点击编辑
  $("editBtn").onclick = () => {
    editingRecipeId = r.id;
    $("name").value = r.name || "";
    $("category").value = r.category || "";
    $("minutes").value = r.minutes || "";
    $("ingredients").value = r.ingredients || "";
    $("steps").value = r.steps || "";
    
    const savedTypes = (r.meal_types || "").split(", ");
    document.querySelectorAll('input[name="mealType"]').forEach(cb => {
      cb.checked = savedTypes.includes(cb.value);
    });

    $("modal").classList.remove("hidden");
  };

  // 点击删除
  $("deleteBtn").onclick = async () => {
    if (confirm("Are you sure you want to delete this recipe?")) {
      const { error } = await supabaseClient
        .from('recipes')
        .delete()
        .eq('id', r.id);

      if (error) {
        alert("Delete failed: " + error.message);
      } else {
        alert("Recipe deleted!");
        await fetchRecipes();
        page("recipes");
      }
    }
  };

  page("detail");
}

// 弹窗控制
if ($("addBtn")) {
  $("addBtn").onclick = () => {
    editingRecipeId = null;
    ["name", "minutes", "ingredients", "steps", "image"].forEach(id => {
      if ($(id))$(id).value = "";
    });
    document.querySelectorAll('input[name="mealType"]').forEach(cb => cb.checked = false);
    $("modal").classList.remove("hidden");
  };
}

if ($("closeModal")) {
  $("closeModal").onclick = () => $("modal").classList.add("hidden");
}

// 保存逻辑
if ($("saveBtn")) {
  $("saveBtn").onclick = () => {
    const name = $("name").value.trim();
    if (!name) {
      alert("Please enter a recipe name.");
      return;
    }

    const selectedMealTypes = Array.from(document.querySelectorAll('input[name="mealType"]:checked'))
      .map(cb => cb.value)
      .join(", ");

    const file = $("image").files[0];

    const finishSave = async (imageData) => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        alert("Please login first.");
        return;
      }

      const recipeData = {
        name: name,
        category: $("category").value,
        minutes: $("minutes").value,
        ingredients: $("ingredients").value,
        steps: $("steps").value,
        meal_types: selectedMealTypes,
        user_id: session.user.id
      };

      if (imageData) {
        recipeData.image = imageData;
      }

      if (editingRecipeId) {
        const { error } = await supabaseClient
          .from('recipes')
          .update(recipeData)
          .eq('id', editingRecipeId);

        if (error) {
          alert("Update failed: " + error.message);
        } else {
          alert("Recipe updated successfully!");
          await fetchRecipes();
          $("modal").classList.add("hidden");
          showDetail(editingRecipeId);
        }
      } else {
        if (!recipeData.image) recipeData.image = "";
        
        const { error } = await supabaseClient
          .from('recipes')
          .insert([recipeData]);

        if (error) {
          alert("Save failed: " + error.message);
        } else {
          alert("Recipe saved successfully!");
          await fetchRecipes();
          $("modal").classList.add("hidden");
        }
      }
    };

    if (file) {
      const rd = new FileReader();
      rd.onload = e => finishSave(e.target.result);
      rd.readAsDataURL(file);
    } else {
      finishSave(null);
    }
  };
}

// 登录与账户控制
supabaseClient.auth.onAuthStateChange((event, session) => {
  const authEl = $("authContainer");
  const userControlEl = $("userControlSection");

  if (session) {
    if (authEl) authEl.style.display = "none";
    if (userControlEl) userControlEl.style.display = "block";
    fetchRecipes();
  } else {
    if (authEl) authEl.style.display = "block";
    if (userControlEl) userControlEl.style.display = "none";
    recipes = [];
    render();
  }
});

if ($("loginBtn")) {
  $("loginBtn").onclick = async () => {
    const email = $("authEmail").value;
    const password = $("authPassword").value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };
}

if ($("signUpBtn")) {
  $("signUpBtn").onclick = async () => {
    const email = $("authEmail").value;
    const password = $("authPassword").value;
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Sign up success!");
  };
}

const logoutBtn = $("logoutBtn");
if (logoutBtn) {
  logoutBtn.onclick = async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      alert("Logout failed: " + error.message);
    } else {
      location.reload();
    }
  };
}

const deleteAccountBtn = $("deleteAccountBtn");
if (deleteAccountBtn) {
  deleteAccountBtn.onclick = async () => {
    if (confirm("确定要注销并彻底删除当前账号吗？")) {
      const { error } = await supabaseClient.rpc("delete_own_user");
      if (error) {
        alert("注销失败，退回为普通退出: " + error.message);
        await supabaseClient.auth.signOut();
      } else {
        await supabaseClient.auth.signOut();
        alert("账号已成功注销！");
      }
      location.reload();
    }
  };
}

render();
