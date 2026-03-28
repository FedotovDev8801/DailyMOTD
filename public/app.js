async function loadMotd() {
  const res = await fetch("/api/motd/today");
  const data = await res.json();
  document.getElementById("motd").innerText = data.text;
}

async function loadLink() {
  const res = await fetch("/api/suggest-link");
  const data = await res.json();
  document.getElementById("suggestLink").href = data.url;
}

document.getElementById("form").addEventListener("submit", async e => {
  e.preventDefault();

  await fetch("/api/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      author: document.getElementById("author").value,
      text: document.getElementById("text").value
    })
  });

  alert("Sent!");
});

loadMotd();
loadLink();
