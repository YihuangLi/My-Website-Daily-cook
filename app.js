const SUPABASE_URL = "https://tvqvqhsfvyczzirbkwcn.supabase.co";
const SUPABASE_KEY = "sb_publishable_h2b6rF43Bb8qeqKmtW6-pQ_6fWr-cUX";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let recipes = [];
let current = null;
let editingRecipeId = null; // 用于记录当前正在编辑的菜谱 ID
const $ = id => document.getElementById(id);

// 辅助函数：转义 HTML 字符防止注入
function esc(s = "") {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

// 页面切换逻辑
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

// 从 Supabase 拉取菜谱数据
async function fetchRecipes() {
  const { data, error } = await supabaseClient.from('recipes').select('*');
  if (error) {
    console.error("Fetch recipes error:", error);
    return;
  }
  recipes = data || [];
  render();
}

// 渲染菜谱列表
function render() {
  if ($("count")) $("count").textContent = recipes.length;
  if ($("recent")) $("recent").textContent = recipes.filter(r => r.lastPicked).length;

  const list = $("recipeList");
  if (!list) return;

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

// 抽签逻辑
if ($("drawBtn")) $("drawBtn").onclick = draw;
if ($("againBtn")) $("againBtn").onclick = draw;
if ($("detailBtn")) $("detailBtn").onclick = () => current && showDetail(current.id);

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

  const chosen = pool[Math.floor(Math.random() * pool.length)] || recipes[0];

  setTimeout(async () => {
    recipes.forEach(r => r.lastPicked = false);
    chosen.lastPicked = true;
    current = chosen;

    await supabaseClient.from('recipes').update({ lastPicked: true }).eq('id', chosen.id);

    $("dice").classList.remove("rolling");
    $("drawBtn").disabled = false;
    $("result").innerHTML = `<span>${esc(chosen.name)}</span>`;
    $("againBtn").classList.remove("hidden");
    $("detailBtn").classList.remove("hidden");

    render();
  }, 900);
}

// 展示菜谱详情（含编辑和删除按钮）
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

        <div style="display: flex; gap: 10px; margin-top: 15px;">
          <button id="editBtn" style="flex: 1;">Edit this recipe</button>
          <button class="secondary" id="deleteBtn" style="flex: 1; background: #e74c3c; color: white;">Delete</button>
        </div>
      </div>
    </div>
  `;

  // 点击编辑按钮：带入数据并打开弹窗
  $("editBtn").onclick = () => {
    editingRecipeId = r.id; // 记下正在编辑的菜谱 ID
    $("name").value = r.name || "";
    $("category").value = r.category || "";
    $("minutes").value = r.minutes || "";
    $("ingredients").value = r.ingredients || "";
    $("steps").value = r.steps || "";
    
    $("modal").classList.remove("hidden");
  };

  // 删除逻辑
  $("deleteBtn").onclick = async () => {
    if (confirm("Are you sure you want to delete this recipe?")) {
      const { error } = await supabaseClient.from('recipes').delete().eq('id', r.id);
      if (error) {
        alert("Delete failed: " + error.message);
      } else {
        recipes = recipes.filter(x => x.id !== r.id);
        render();
        page("recipes");
      }
    }
  };

  page("detail");
}

// 打开添加弹窗（清空编辑状态）
if ($("addBtn")) {
  $("addBtn").onclick = () => {
    editingRecipeId = null; // 清空编辑状态，表示这是新增
    ["name", "minutes", "ingredients", "steps", "image"].forEach(id => {
      if ($(id))$(id).value = "";
    });
    $("modal").classList.remove("hidden");
  };
}

if ($("closeModal")) {
  $("closeModal").onclick = () => $("modal").classList.add("hidden");
}

// 保存逻辑（兼顾【新增】与【修改/Update】）
if ($("saveBtn")) {
  $("saveBtn").onclick = () => {
    const name = $("name").value.trim();
    if (!name) {
      alert("Please enter a recipe name.");
      return;
    }

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
        user_id: session.user.id
      };

      // 如果选了新图片才更新图片，没选就保留原样
      if (imageData) {
        recipeData.image = imageData;
      }

      if (editingRecipeId) {
        // 1. 修改/更新逻辑 (UPDATE)
        const { error } = await supabaseClient
          .from('recipes')
          .update(recipeData)
          .eq('id', editingRecipeId);

        if (error) {
          alert("Update failed: " + error.message);
        } else {
          alert("Recipe updated successfully!");
          await fetchRecipes(); // 重新拉取最新数据
          $("modal").classList.add("hidden");
          showDetail(editingRecipeId); // 刷新当前详情页
        }
      } else {
        // 2. 新增逻辑 (INSERT)
        if (!recipeData.image) recipeData.image = "";
        
        const { data, error } = await supabaseClient
          .from('recipes')
          .insert([recipeData])
          .select();

        if (error) {
          alert("Save failed: " + error.message);
        } else {
          alert("Recipe saved successfully!");
          if (data && data.length > 0) recipes.unshift(data[0]);
          render();
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

// 监听登录/退出状态
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

// 登录按钮事件
if ($("loginBtn")) {
  $("loginBtn").onclick = async () => {
    const email = $("authEmail").value;
    const password = $("authPassword").value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };
}

// 注册按钮事件
if ($("signUpBtn")) {
  $("signUpBtn").onclick = async () => {
    const email = $("authEmail").value;
    const password = $("authPassword").value;
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Sign up success!");
  };
}

// 退出登录按钮
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

// 注销账号按钮
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

// 初始化
render();
