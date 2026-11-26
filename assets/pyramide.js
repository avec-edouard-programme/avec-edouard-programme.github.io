// Programmes 2027 · version « pyramide » (25/11/2026)
// Quatre étages (26/11) : 1 message et diffusion, 2 éléments de langage, 3 priorités et propositions, 4 programmes au crible. Plus : sources, équipe.
// Chargé avant app.js ; app.js appelle chaque PA.mods avec le contexte (contenu déchiffré, outils de rendu).
(function () {
  "use strict";
  var PA = (window.PA = window.PA || { mods: [] });
  PA.mods = PA.mods || [];
  PA.pages = [["edl", "Par chantier"], ["personas", "Électeurs simulés"], ["contexte", "Contexte de travail"], ["messages", "Messages à débattre"], ["programmes", "Tous les programmes"], ["recit", "Le récit"], ["discours", "Discours"], ["banque", "Électeurs à appeler"], ["propositions", "Par thème"], ["notes", "Notes en discussion"], ["edu-prop", "Éducation"], ["analyse", "Ce qu'il faut changer"], ["edu-ecole", "École et enseignants"], ["edu-handicap", "Handicap et santé mentale"], ["edu-orientation", "Orientation et emploi"], ["edu-voiepro", "Voie pro"], ["edu-international", "Ailleurs"], ["edu-boussole", "Boussole"], ["edu-tester", "Tester une proposition d'école"], ["reseaux", "Réseaux"], ["sources", "Sources"], ["contribuer", "Contribuer"]];
  PA.routes = {};
  PA.sansBoite = ["edl", "personas", "contexte", "messages", "programmes", "accueil", "recit", "discours", "banque", "propositions", "notes", "edu-prop", "analyse", "edu-ecole", "edu-handicap", "edu-orientation", "edu-voiepro", "edu-international", "edu-boussole", "edu-tester", "reseaux", "sources", "contribuer"];

  // La correction proposée, mesure par mesure : toujours un texte déjà écrit par le groupe (analyse, élément de langage proposé, leçon étrangère)
  var RP = /(Mieux vaut|Mieux vaudrait|La piste sérieuse|Privilégions|Ciblons|Réservons|Conditionnons|Il faut (?:plutôt|le|reprendre)|Je recommande|Préférer)[^.]*\./;
  var RA = /devrait|faudrait|permettrait|rendrait|mieux vaut|plutôt que|suppose de|exige|gagnerait|à condition|sans quoi|implique/i;
  var phrases = function (s) { return String(s || "").replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-ZÀÉÈÎÔ«])/); };
  PA.mieux = function (m, anal, C) {
    var a = m.analyses.length ? anal[m.analyses[0]] : null; if (!a) return null;
    var d = String(a.detail || ""), x = d.split("**Ailleurs.**"), f = String(a.fiche || "").split("**Ailleurs.**")[0];
    var p = phrases(f).filter(function (s) { return RP.test(s); })[0] || phrases(x[0]).filter(function (s) { return RP.test(s); })[0];
    if (m.num === 141) return null; // analyse partagée avec N°85 et N°113 : la correction ne porte que sur le pacte Dutreil (N°85)
    if (p && m.num !== 113) return { k: "À changer", t: p };
    var e = m.edl_propose && m.edl_propose.par_analyse && m.edl_propose.par_analyse[0];
    if (e && e.edl) return { k: "Formulation proposée", t: phrases(e.edl).slice(0, 2).join(" ") };
    if (x[1] && !/Aucun exemple étranger/.test(x[1])) { var y = phrases(x[1].trim().split("\n")[0]), l = y[y.length - 1]; if (RA.test(l)) return { k: "Leçon d'ailleurs", t: l }; }
    return null;
  };
  PA.mieuxHtml = function (m, anal, inline, C) { var x = PA.mieux(m, anal, C); return x ? '<p class="mieux"><b>' + x.k + " :</b> " + inline(x.t) + "</p>" : ""; };

  PA.mods.push(function (ctx) {
    var C = ctx.C, $ = ctx.$, $$ = ctx.$$, esc = ctx.esc, inline = ctx.inline, TH = ctx.TH, byNum = ctx.byNum, plural = ctx.plural, fdate = ctx.fdate, norm = ctx.norm, go = ctx.go;
    var el = function (id) { return $("#p-" + id); };
    var lk = function (s) { return String(s).replace(/ ([»;?!%€])/g, "\u00a0$1").replace(/ :(?=[\s<]|$)/g, "\u00a0:").replace(/« /g, "«\u00a0").replace(/N°\s?(\d+)(?![^<]*<\/a>)/g, function (m, n) { return byNum[+n] ? '<a href="#" data-n="' + n + '">N°' + n + "</a>" : m; }); };
    var numLk = function (ns) { return (ns || []).filter(function (n) { return byNum[+n]; }).map(function (n) { return '<a href="#" data-n="' + n + '">N°' + n + "</a>"; }).join(" "); };

    // ---------- rendu Markdown complet (titres, listes, tableaux, citations, code)
    var rich = function (src, dec) {
      var L = String(src || "").split("\n"), o = [], i = 0, base = dec || 0;
      var H = function (n, t) { n = Math.min(4, n + base); return "<h" + n + ' class="h' + n + '">' + lk(inline(t)) + "</h" + n + ">"; };
      while (i < L.length) {
        var l = L[i], m;
        if (!l.trim()) { i++; continue; }
        if (/^```/.test(l)) { var c = []; i++; while (i < L.length && !/^```/.test(L[i])) c.push(L[i++]); i++; o.push("<pre><code>" + esc(c.join("\n")) + "</code></pre>"); continue; }
        if ((m = l.match(/^(#{1,4}) (.*)$/))) { o.push(H(m[1].length, m[2])); i++; continue; }
        if (/^\s*\|/.test(l) && /^\s*\|[-:| ]+\|\s*$/.test(L[i + 1] || "")) {
          var cells = function (r) { return r.trim().replace(/^\||\|$/g, "").split("|").map(function (x) { return lk(inline(x.trim())); }); };
          var head = cells(l), rows = []; i += 2; while (i < L.length && /^\s*\|/.test(L[i])) rows.push(cells(L[i++]));
          o.push('<div class="scroll"><table class="cmp"><thead><tr>' + head.map(function (x) { return "<th>" + x + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.map(function (r) { return "<tr>" + r.map(function (x) { return "<td>" + x + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>"); continue;
        }
        if (/^>\s?/.test(l)) { var q = []; while (i < L.length && /^>\s?/.test(L[i])) q.push(L[i++].replace(/^>\s?/, "")); o.push('<div class="box">' + q.filter(function (x) { return x.trim(); }).map(function (x) { return "<p>" + lk(inline(x)) + "</p>"; }).join("") + "</div>"); continue; }
        if (/^\s*[-*] /.test(l)) { var u = []; while (i < L.length && /^\s*[-*] /.test(L[i])) u.push("<li>" + lk(inline(L[i++].replace(/^\s*[-*] /, ""))) + "</li>"); o.push("<ul>" + u.join("") + "</ul>"); continue; }
        if (/^\s*\d+[.)] /.test(l)) { var n = []; while (i < L.length && /^\s*\d+[.)] /.test(L[i])) n.push("<li>" + lk(inline(L[i++].replace(/^\s*\d+[.)] /, ""))) + "</li>"); o.push("<ol>" + n.join("") + "</ol>"); continue; }
        if (/^\s*(---+|\*\*\*+)\s*$/.test(l)) { o.push("<hr>"); i++; continue; }
        var p = []; while (i < L.length && L[i].trim() && !/^(#{1,4} |```|>|\s*[-*] |\s*\d+[.)] |\s*\|)/.test(L[i])) p.push(L[i++]);
        if (!p.length) p.push(L[i++]);
        o.push("<p>" + lk(inline(p.join(" "))) + "</p>");
      }
      return o.join("");
    };

    // ---------- navigation
    var AN = TH.map(function (t) { return [t.id, t.court]; });
    var EDU = [["ecole", "Mesures du livret"], ["edu-ecole", "École et enseignants"], ["edu-handicap", "Handicap et santé mentale"], ["edu-orientation", "Orientation et emploi"], ["edu-voiepro", "Voie pro"], ["edu-international", "Ailleurs"], ["edu-boussole", "Boussole"], ["edu-tester", "Tester"]];
    var G = [
      { id: "edl", n: "1", t: "Éléments de langage", pages: [["edl", "Par chantier"], ["personas", "Électeurs simulés"]] },
      { id: "priorites", n: "2", t: "Priorités et propositions", pages: [["priorites", "Les priorités"], ["propositions", "Nouvelles propositions"], ["droite", "Bonnes idées des autres programmes"], ["notes", "Notes en discussion"], ["edu-prop", "Éducation"]] },
      { id: "programmes", n: "3", t: "Programmes au crible", pages: [["programmes", "Par thème"], ["analyse", "Ce qu'il faut changer"]].concat(AN, [["chiffrage", "Chiffrage"]]) },
      { id: "sources", t: "Sources", util: 1, pages: [["sources", "Sources"], ["contribuer", "Contribuer"], ["methode", "Méthode"]] },
      { id: "membres", t: "Équipe", util: 1, pages: [["contexte", "Contexte de travail"], ["membres", "Membres"], ["organisation", "Organisation"], ["noteia", "Note IA du groupe"]] }
    ];
    var groupOf = {}; G.forEach(function (g) { g.pages.forEach(function (p) { groupOf[p[0]] = g; }); }); EDU.forEach(function (p) { if (!groupOf[p[0]]) groupOf[p[0]] = G[3]; });
    var nav = document.createElement("nav"); nav.className = "pnav"; nav.setAttribute("aria-label", "Navigation principale");
    var link = function (g) { return '<a href="#' + g.id + '" data-go="' + g.id + '" data-g="' + g.id + '">' + esc(g.t) + "</a>"; };
    nav.innerHTML = '<span class="pn-p">' + G.filter(function (g) { return g.n; }).map(link).join("") + '</span><span class="pn-c">' + G.filter(function (g) { return g.cote; }).map(link).join("") + '</span><span class="pn-u">' + G.filter(function (g) { return g.util; }).map(link).join("") + "</span>";
    $(".top .wrap").appendChild(nav);
    var sub = document.createElement("div"); sub.className = "psub wrap"; $(".top").appendChild(sub);
    var ix = $("#app"); var row = function (pages, id, cls) { return '<nav class="' + cls + '">' + pages.map(function (p) { return '<a href="#' + p[0] + '" data-go="' + p[0] + '"' + (p[0] === id ? ' aria-current="page"' : "") + ">" + esc(p[1]) + "</a>"; }).join("") + "</nav>"; };
    PA.onGo = function (id) {
      var g = groupOf[id];
      document.body.setAttribute("data-vue", id === "accueil" ? "accueil" : "page");
      $$(".pnav a").forEach(function (a) { if (g && a.getAttribute("data-g") === g.id) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
      var isEdu = EDU.some(function (p) { return p[0] === id; });
      var h = "";
      if (g && g.pages.length > 1) h += row(g.pages, isEdu ? "ecole" : id, "psub1");
      if (isEdu) h += row(EDU, id, "psub2");
      sub.innerHTML = h; sub.hidden = !h;
    };
    var brand = $(".brand"); if (brand) { brand.setAttribute("data-go", "accueil"); brand.setAttribute("role", "link"); brand.tabIndex = 0; brand.addEventListener("keydown", function (e) { if (e.key === "Enter") go("accueil"); }); }

    // ---------- dépôt partagé (GitHub) : commentaires, modifications, personas, sources
    var DEP = C.depot || { nom: "" }, TK = "pa-jeton", store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } } };
    var jeton = function () { return DEP.jeton || store.get(TK); };
    var auteur = function () { var w = ctx.who(); return (w && w.nom) || ""; };
    var api = function (path, opt) {
      var t = jeton(); if (!t) return Promise.reject(new Error("sans-jeton"));
      opt = opt || {}; return fetch("https://api.github.com/repos/" + DEP.nom + path, { method: opt.method || "GET", cache: "no-store", headers: { Authorization: "Bearer " + t, Accept: "application/vnd.github+json" }, body: opt.body ? JSON.stringify(opt.body) : undefined })
        .then(function (r) { if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? "jeton refusé" : r.status === 404 ? "dépôt ou droits introuvables" : "erreur " + r.status); return r.json(); });
    };
    var parse = function (b) { var m = String(b || "").match(/```json\s*([\s\S]*?)```/); if (!m) return null; try { return JSON.parse(m[1]); } catch (e) { return null; } };
    var cache = null;
    var fils = function (force) {
      if (!jeton()) return Promise.resolve([]);
      if (cache && !force) return cache;
      cache = api("/issues?state=all&per_page=100&sort=created&direction=desc").then(function (xs) {
        return xs.filter(function (x) { return !x.pull_request; }).map(function (x) { var m = x.title.match(/^\[(commentaire|modification|persona|source|note|test)\]/); var j = m && parse(x.body); return j ? { type: m[1], n: x.number, ouvert: x.state === "open", date: x.created_at, rep: x.comments, j: j, url: x.html_url } : null; }).filter(Boolean);
      });
      cache.catch(function () { cache = null; });
      return cache;
    };
    var poster = function (type, titre, texte, j) {
      j.type = type; j.auteur = auteur() || j.auteur || "";
      return api("/issues", { method: "POST", body: { title: "[" + type + "] " + titre.slice(0, 120), body: texte + "\n\n```json\n" + JSON.stringify(j, null, 1).replace(/```/g, "'''") + "\n```" } }).then(function (x) { cache = null; return x; });
    };
    var BK = "pa-brouillons", brouillons = function () { try { return JSON.parse(store.get(BK) || "[]"); } catch (e) { return []; } };
    var garder = function (b) { var a = brouillons(); a.push(b); store.set(BK, JSON.stringify(a)); };
    var connexion = function () {
      return '<details class="cnx"><summary>' + (jeton() ? "Connecté au dépôt partagé" : "Pour enregistrer : se connecter au dépôt partagé") + "</summary>" +
        '<p class="mut">Vos commentaires et modifications sont enregistrés dans le dépôt privé ' + esc(DEP.nom) + ". " + (DEP.jeton ? "L'accès est déjà inclus dans le site : indiquez seulement votre nom." : "Collez votre jeton GitHub (accès « Issues » à ce seul dépôt). Il reste dans ce navigateur. Sans jeton, vos textes sont gardés ici comme brouillons.") + "</p>" +
        '<p class="filters"><input class="cx-nom" placeholder="Votre nom" value="' + esc(auteur()) + '">' + (DEP.jeton ? "" : '<input class="cx-jeton" type="password" autocomplete="off" placeholder="Jeton GitHub">') + '<button class="chip cx-ok">Enregistrer</button>' + (store.get(TK) ? '<button class="chip cx-out">Oublier le jeton</button>' : "") + '</p><p class="mut cx-msg" role="status"></p></details>';
    };
    document.addEventListener("click", function (ev) {
      var t = ev.target; if (!t.closest) return;
      var c = t.closest(".cx-ok"); if (c) {
        var b = c.closest(".cnx"), nom = b.querySelector(".cx-nom").value.trim(), jt = b.querySelector(".cx-jeton");
        if (nom) store.set("programmes2027-auteur", JSON.stringify({ nom: nom, role: "" }));
        if (jt && jt.value.trim()) store.set(TK, jt.value.trim());
        if (!jeton()) { b.querySelector(".cx-msg").textContent = "Nom enregistré. Sans jeton, vos textes restent des brouillons sur cet ordinateur."; return; }
        b.querySelector(".cx-msg").textContent = "Vérification…";
        api("").then(function () { var a = brouillons(); store.set(BK, "[]"); return a.reduce(function (p, x) { return p.then(function () { return poster(x.type, x.titre, x.texte, x.j); }); }, Promise.resolve()).then(function () { b.querySelector(".cx-msg").textContent = "Connecté." + (a.length ? " " + plural(a.length, "brouillon") + " envoyés." : ""); }, function () { store.set(BK, JSON.stringify(a)); throw new Error("envoi incomplet"); }); }).catch(function (e) { b.querySelector(".cx-msg").textContent = "Échec : " + e.message; });
        return;
      }
      if (t.closest(".cx-out")) { store.set(TK, null); cache = null; location.reload(); }
    });
    var envoi = function (type, titre, texte, j, out) {
      if (!auteur()) { out("Indiquez d'abord votre nom (bloc « se connecter »)."); return Promise.resolve(null); }
      if (!jeton()) { garder({ type: type, titre: titre, texte: texte, j: j }); out("Gardé comme brouillon sur cet ordinateur : il partira quand vous serez connecté."); return Promise.resolve(null); }
      out("Envoi…");
      return poster(type, titre, texte, j).then(function (x) { out("Enregistré (n° " + x.number + ")."); return x; }, function (e) { garder({ type: type, titre: titre, texte: texte, j: j }); out("Non enregistré (" + e.message + "). Gardé comme brouillon."); return null; });
    };
    PA.envoyer = function (all, w) { // boîtes « Modifier ou commenter » des anciennes pages
      if (!jeton()) return false;
      all.reduce(function (p, c) { return p.then(function () { return poster("commentaire", c.label || c.id, (c.commentaire || "") + "\n\nVersion proposée : " + c.version, { cible: c.id, extrait: (c.texte || "").slice(0, 300), texte: c.commentaire || "", version: c.version, auteur: (w && w.nom) || "" }); }); }, Promise.resolve())
        .then(function () { all.forEach(function (c) { store.set("programmes2027-cmt:" + c.id, null); }); window.alert && console.log("envoyé"); $$(".csend").forEach(function (b) { b.textContent = "Commentaires envoyés"; }); }, function (e) { $$(".csend").forEach(function (b) { b.textContent = "Échec : " + e.message; }); });
      return true;
    };

    // ---------- document modifiable et commentable (bloc par bloc)
    var blocs = function (src) {
      var out = [], cur = [], push = function () { if (cur.length) { out.push(cur.join("\n")); cur = []; } };
      String(src).split("\n").forEach(function (l) {
        if (!l.trim()) { push(); return; }
        if (/^(#{1,4} |\s*[-*] |\s*\d+[.)] |> ?)/.test(l) && !/^\s*\|/.test(l)) { push(); out.push(l); return; }
        cur.push(l);
      });
      push(); return out;
    };
    var doc = function (box, d) { // d : {id, fichier, md}
      var B = blocs(d.md);
      var kind = function (b) { return /^#/.test(b) ? "h" : /^>/.test(b) ? "q" : /^\s*[-*] /.test(b) ? "li" : /^\s*\d+[.)] /.test(b) ? "li" : "p"; };
      var draw = function (b) { var k = kind(b); if (k === "li") return '<p class="dli">' + lk(inline(b.replace(/^\s*([-*]|\d+[.)]) /, ""))) + "</p>"; if (k === "q") return "<p>" + lk(inline(b.replace(/^>\s?/, ""))) + "</p>"; return rich(b, 1); };
      box.innerHTML = '<div class="dnote">' + connexion() + '<p class="mut dhelp">Passez sur un paragraphe pour le modifier ou le commenter. Pour commenter une phrase, sélectionnez-la d\'abord.</p><div class="dbody">' +
        B.map(function (b, i) { return '<div class="db db-' + kind(b) + '" data-i="' + i + '"><div class="dtx">' + draw(b) + '</div><div class="dact"><button data-a="c">Commenter</button><button data-a="m">Modifier</button></div><div class="dx"></div></div>'; }).join("") + "</div></div>";
      var deco = function (xs) {
        $$(".dx", box).forEach(function (x) { x.innerHTML = ""; });
        var ici = xs.filter(function (x) { return x.j.fichier === d.fichier; });
        ici.slice().reverse().forEach(function (x) {
          var key = x.type === "modification" ? x.j.avant : x.j.bloc, i = B.indexOf(key), host = i >= 0 ? $('.db[data-i="' + i + '"] .dx', box) : null;
          if (x.type === "modification") { if (i < 0 || !host) return; host.insertAdjacentHTML("beforeend", '<div class="dprop"><p class="kick">' + esc(x.j.auteur) + " · " + esc(fdate(x.date)) + (x.ouvert ? " · en cours d'intégration" : " · intégrée, visible à la prochaine mise à jour") + '</p><p class="trk">' + ctx.wdiff(x.j.avant, x.j.apres) + "</p></div>"); return; }
          if (x.type !== "commentaire") return;
          var html = '<div class="dcom' + (x.ouvert ? "" : " clos") + '" data-num="' + x.n + '"><p class="kick">' + esc(x.j.auteur) + " · " + esc(fdate(x.date)) + (x.ouvert ? "" : " · résolu") + "</p>" + (x.j.extrait ? '<blockquote>' + esc(x.j.extrait) + "</blockquote>" : "") + "<p>" + esc(x.j.texte) + "</p>" + '<div class="drep"></div><p class="dact2">' + (x.rep ? '<button data-a="v">Voir ' + plural(x.rep, "réponse") + "</button>" : "") + '<button data-a="r">Répondre</button>' + (x.ouvert ? '<button data-a="f">Résolu</button>' : "") + "</p></div>";
          if (host) host.insertAdjacentHTML("beforeend", html); else $(".dbody", box).insertAdjacentHTML("beforeend", '<div class="db"><div class="dx">' + html + "</div></div>");
        });
      };
      var refresh = function (f) { fils(f).then(deco, function () { /* hors ligne */ }); };
      refresh();
      box.onclick = function (ev) {
        var bt = ev.target.closest && ev.target.closest("button[data-a]"); if (!bt) return; ev.preventDefault();
        var a = bt.getAttribute("data-a"), host = bt.closest(".db"), i = +host.getAttribute("data-i"), raw = B[i], com = bt.closest(".dcom");
        if (a === "v" || a === "r" || a === "f") {
          var num = com.getAttribute("data-num"), rep = $(".drep", com);
          if (a === "v") api("/issues/" + num + "/comments").then(function (cs) { rep.innerHTML = cs.map(function (c) { return '<p class="drp"><span class="kick">' + esc(fdate(c.created_at)) + "</span> " + esc(c.body) + "</p>"; }).join(""); bt.remove(); }, function (e) { rep.textContent = e.message; });
          if (a === "f") api("/issues/" + num, { method: "PATCH", body: { state: "closed" } }).then(function () { refresh(true); }, function (e) { rep.textContent = e.message; });
          if (a === "r") { if ($("textarea", com)) return; com.insertAdjacentHTML("beforeend", '<textarea rows="2" placeholder="Votre réponse"></textarea><p class="filters"><button class="chip" data-a="rs">Envoyer</button></p>'); }
          return;
        }
        if (a === "rs") { var v = $("textarea", com).value.trim(); if (!v) return; api("/issues/" + com.getAttribute("data-num") + "/comments", { method: "POST", body: { body: (auteur() ? auteur() + " : " : "") + v } }).then(function () { refresh(true); }, function (e) { bt.textContent = e.message; }); return; }
        var x = $(".dx", host), old = $(".dform", host); if (old) old.remove();
        if (a === "x") return;
        if (a === "c" || a === "m") {
          var sel = String(window.getSelection ? window.getSelection() : "").trim(), ex = a === "c" && sel && norm($(".dtx", host).textContent).indexOf(norm(sel)) >= 0 ? sel : "";
          x.insertAdjacentHTML("afterbegin", '<div class="dform" data-ex="' + esc(ex) + '">' + (ex ? "<blockquote>" + esc(ex) + "</blockquote>" : "") + '<textarea rows="' + (a === "m" ? Math.max(3, Math.ceil(raw.length / 85)) : 3) + '" placeholder="Votre commentaire">' + (a === "m" ? esc(raw) : "") + "</textarea>" + (a === "m" ? '<p class="trk"></p>' : "") + '<p class="filters"><button class="chip" data-a="' + (a === "m" ? "ms" : "cs") + '">Enregistrer</button><button class="chip" data-a="x">Annuler</button></p><p class="mut dmsg" role="status"></p></div>');
          var ta = $(".dform textarea", host); ta.focus();
          if (a === "m") ta.addEventListener("input", function () { $(".dform .trk", host).innerHTML = ta.value === raw ? "" : ctx.wdiff(raw, ta.value); });
          return;
        }
        var form = old, val = form ? form.querySelector("textarea").value.trim() : ""; if (!form || !val) return;
        x.insertAdjacentElement("afterbegin", form);
        var msg = function (s) { form.querySelector(".dmsg").textContent = s; };
        if (a === "cs") envoi("commentaire", d.titre || d.id, auteur() + " : " + val, { fichier: d.fichier, bloc: raw, extrait: form.getAttribute("data-ex"), texte: val }, msg).then(function (r) { if (r) refresh(true); });
        if (a === "ms") { if (val === raw.trim()) { msg("Aucun changement."); return; } envoi("modification", d.titre || d.id, "Modification proposée dans " + d.fichier, { fichier: d.fichier, avant: raw, apres: val }, msg).then(function (r) { if (r) refresh(true); }); }
      };
    };

    // ---------- accueil : la pyramide
    (function () {
      var SI = C.sources_index || [], nP = SI.filter(function (x) { return x.categorie === "proposition"; }).length, nS = SI.filter(function (x) { return x.categorie === "litterature"; }).length;
      var pers = ((C.electeurs || {}).personas || []).length + (C.banque || []).filter(function (b) { return b.persona !== "multi"; }).length;
      var nR = (C.adversaires || []).length + 1;
      var CR = (C.chantiers_reunion || { chantiers: [] }).chantiers;
      var ET = [
        { id: "edl", t: "Éléments de langage", s: "Ce qu'il faut dire sur les chantiers du groupe, et le programme face aux électeurs simulés.", c: CR.length + " chantiers · " + pers + " électeurs simulés" },
        { id: "priorites", t: "Priorités et propositions", s: "Ce qui doit porter la campagne, ce qui manque, les bonnes idées à prendre ailleurs.", c: ((C.priorites || {}).proposition || []).length + " priorités" + (nP ? " · " + nP + " propositions" : "") },
        { id: "programmes", t: "Programmes au crible", s: "Chaque thème, chaque mesure, tous les candidats : preuves, coût, exemples étrangers.", c: nR + " programmes · " + C.philippe.mesures.length + " mesures du livret" + (nS ? " · " + nS + " sources" : "") }
      ];
      var W = 400, H = 300, n = ET.length, gap = 7, hh = (H - gap * (n - 1)) / n, x = function (y) { return (W / 2) * (y / H); };
      var svg = '<svg class="pyr" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Pyramide : éléments de langage, priorités et propositions, programmes au crible">' + ET.map(function (e, i) {
        var y0 = i * (hh + gap), y1 = y0 + hh, c = W / 2;
        return '<a href="#' + e.id + '" data-go="' + e.id + '" data-et="' + e.id + '" class="et et' + (i + 1) + '" aria-label="' + esc(e.t) + '"><polygon points="' + [[c - x(y0), y0], [c + x(y0), y0], [c + x(y1), y1], [c - x(y1), y1]].map(function (p) { return p.join(","); }).join(" ") + '"></polygon><text x="' + c + '" y="' + (y0 + hh * (i ? 0.58 : 0.74)) + '" text-anchor="middle">' + (i + 1) + "</text></a>";
      }).join("") + "</svg>";
      PA.svgPyr = svg; PA.etages = ET;
      PA.tableau = el("accueil").innerHTML; // ancien accueil, gardé dans « Analyse »
      el("accueil").innerHTML = '<div class="hero"><p class="kick">Document de travail · mis à jour le ' + fdate(C.genere_le) + " · J-" + ctx.days(ctx.ELECTION) + '</p><h1 class="nom">Préparer <em>l\'avenir</em></h1><p class="slogan">La volonté d\'agir</p></div>' +
        '<div class="pyrg">' + svg + '<ol class="etl">' + ET.map(function (e, i) { return '<li data-et="' + e.id + '"><a href="#' + e.id + '" data-go="' + e.id + '"><span class="kick">' + (i + 1) + '</span><b>' + esc(e.t) + "</b><span>" + esc(e.s) + '</span><span class="kick">' + esc(e.c) + "</span></a></li>"; }).join("") + "</ol></div>" +
        '<div class="cotes"><a href="#sources" data-go="sources"><span class="kick">Dépôt</span><b>Sources</b><span>Littérature et programmes, par thème.</span></a><a href="#contribuer" data-go="contribuer"><span class="kick">Dépôt</span><b>Contribuer</b><span>Depuis le site, GitHub, Claude Code ou Codex.</span></a></div>';
      $$("[data-et]", el("accueil")).forEach(function (a) { ["mouseenter", "mouseleave"].forEach(function (ev) { a.addEventListener(ev, function () { $$('[data-et="' + a.getAttribute("data-et") + '"]', el("accueil")).forEach(function (b) { b.classList.toggle("on", ev === "mouseenter"); }); }); }); });
    })();


    // ---------- 3. programmes au crible, par thème (pas par candidat) : un clic par thème, puis par mesure
    (function () {
      var box = el("programmes"); if (!box) return;
      var P = C.philippe, ms = P.mesures;
      box.innerHTML = '<div class="thead"><h1>Programmes au crible</h1><p class="mut">Choisissez un thème : chaque mesure, ce qu\'il faut changer, et ce que proposent les autres candidats.</p></div><div class="thg">' +
        TH.map(function (th) {
          var m = ms.filter(function (x) { return x.theme === th.id; }), fx = m.filter(function (x) { return PA.mieux(x, P.analyses, C); }).length;
          var adv = (th.adv || []).filter(function (x) { return x.items.length || x.fiches.length; });
          return '<a class="thc" href="#' + th.id + '" data-go="' + th.id + '"><b>' + esc(th.nom) + "</b>" + ctx.vbar(m) + '<span class="kick">' + m.length + " mesures · " + fx + " à changer</span><span class=\"mut\">" + (adv.length ? adv.map(function (x) { return esc(x.a.nom.split(" ").slice(-1)[0]); }).join(" · ") : "autres candidats : à venir") + "</span></a>";
        }).join("") + "</div>";
    })();



    // ---------- aperçu « au crible » d'un ou plusieurs thèmes
    PA.apercu = function (ids) {
      var P = C.philippe, SI = C.sources_index || [];
      ids = ids.filter(function (id, i) { return ctx.thById[id] && ids.indexOf(id) === i; });
      if (!ids.length) return "";
      return '<details class="in apc"><summary>Au crible : ' + ids.map(function (id) { return esc(ctx.thById[id].nom); }).join(", ") + "</summary>" + ids.map(function (id) {
        var th = ctx.thById[id], ms = P.mesures.filter(function (m) { return m.theme === id; });
        var fx = ms.map(function (m) { return { m: m, x: PA.mieux(m, P.analyses, C) }; }).filter(function (r) { return r.x; }).slice(0, 3);
        var adv = (th.adv || []).filter(function (x) { return x.items.length || x.fiches.length; });
        var lit = SI.filter(function (s) { return s.theme === id && s.categorie === "litterature"; }), ty = {};
        lit.forEach(function (s) { ty[s.type] = (ty[s.type] || 0) + 1; });
        var ail = ms.filter(function (m) { var a = m.analyses.length ? P.analyses[m.analyses[0]] : null; return a && /Ailleurs/.test((a.detail || "") + (a.fiche || "")) && !/Aucun exemple étranger/.test(a.detail || ""); }).length;
        return '<div class="apt"><h4>' + esc(th.nom) + "</h4>" +
          "<p><b>Ce que disent les candidats.</b> Édouard Philippe : " + ms.length + " mesures" + (adv.length ? " · " + adv.map(function (x) { return esc(x.a.nom) + " : " + (x.items.length || x.fiches.length); }).join(" · ") : " · autres candidats : à analyser") + "</p>" + ctx.vbar(ms) +
          (fx.length ? "<p><b>Ce qu'il faut changer.</b></p><ul>" + fx.map(function (r) { return "<li>N°" + r.m.num + " : " + inline(r.x.t) + "</li>"; }).join("") + "</ul>" : "") +
          "<p><b>Le socle.</b> " + (ty.causal || 0) + " études causales · " + (ty.rapport || 0) + " rapports publics · " + (ty.descriptif || 0) + " études descriptives · " + (ty["a-classer"] || 0) + " sources à classer · exemple étranger pour " + ail + " mesure" + (ail > 1 ? "s" : "") + " sur " + ms.length + '</p><p><a href="#' + id + '" data-go="' + id + '">Ouvrir le thème</a></p></div>';
      }).join("") + "</details>";
    };
    (function () { // sous chaque priorité du groupe
      var box = el("priorites"), PR = (C.priorites || {}).proposition || []; if (!box || !PR.length) return;
      var byNum = ctx.byNum;
      box.insertAdjacentHTML("beforeend", '<section><h2 class="h2">Les priorités du groupe, au crible</h2>' + PR.map(function (p) {
        var ids = (p.nums || []).map(function (n) { return byNum[n] && byNum[n].theme; }).filter(Boolean);
        return '<div class="entree"><b>' + esc(p.rang + ". " + p.titre) + "</b>" + PA.apercu(ids) + "</div>";
      }).join("") + "</section>");
    })();
    // ---------- 1. éléments de langage par chantier (réunion du 15/11), remplis par les notes des membres
    (function () {
      var box = el("edl"); if (!box) return;
      var CR = C.chantiers_reunion || { chantiers: [] }, NG = C.notes_groupe || [];
      box.innerHTML = '<div class="thead"><h1>Éléments de langage</h1><p class="mut">' + esc(CR.source || "") + "</p></div>" + CR.chantiers.map(function (c) {
        var ns = NG.filter(function (n) { return n.meta.chantier === c.id; });
        return '<div class="entree"><b>' + esc(c.nom) + "</b>" + (ns.length ? ns.map(function (n) { var m = n.socle && n.socle.message; return '<span>' + (m && m.une_minute ? "« " + esc(m.une_phrase) + " »" : "Soundbite à écrire") + ' · <a href="#notes/' + esc(n.id) + '" data-go="notes" data-sub="' + esc(n.id) + '">' + esc(n.meta.auteur) + "</a></span>"; }).join("") : '<span class="mut">Vide pour l\'instant.</span>') + PA.apercu(c.themes || []) + "</div>";
      }).join("");
    })();

    // ---------- 1. électeurs simulés : les électeurs, et le programme entier face à eux (graphiques)
    (function () {
      var box = el("personas"); if (!box) return;
      var EL = C.electeurs || {}, PS = (EL.personas || []).filter(function (p) { return EL.chantiers_avis && EL.chantiers_avis[p.id]; }), CH = EL.chantiers || [], W = EL.poids || {}, VX = C.voix || {};
      var col = { "-2": "#c4342d", "-1": "#f0a59b", "0": "#e4e3df", "1": "#86b6ef", "2": "#2a78d6" };
      var note = function (p, c) { var a = (EL.chantiers_avis[p.id].chantiers || []).filter(function (x) { return x.id === c.id; })[0]; return a || null; };
      var moy = function (c) { var t = 0, s = 0; PS.forEach(function (p) { var a = note(p, c); if (a && typeof a.note === "number") { var w = W[p.id] || 0; t += w; s += w * a.note; } }); return t ? s / t : null; };
      var court = function (s) { return String(s).split(",")[0].replace(/^(Jeune |Patron de )/, "").slice(0, 20); };
      var sg = function (s) { return (s > 0 ? "+" : s < 0 ? "−" : "") + Math.abs(s).toFixed(1).replace(".", ","); };
      var LW = 250, CW = 30, RH = 26, TOP = 175, LBL = { "-2": "rejet", "-1": "plutôt contre", "0": "neutre", "1": "plutôt pour", "2": "adhésion" };
      var cases = '<div class="hwrap"><svg class="pmap" viewBox="0 0 ' + (LW + PS.length * (CW + 2) + 60) + " " + (TOP + CH.length * (RH + 2)) + '" role="img" aria-label="Note de chaque électeur pour chaque chantier, de rejet à adhésion">' +
        PS.map(function (p, k) { var x = LW + k * (CW + 2) + CW / 2; return '<text class="ph" transform="translate(' + x + "," + (TOP - 8) + ') rotate(-55)">' + esc(court(p.libelle)) + "</text>"; }).join("") +
        '<text class="ph" transform="translate(' + (LW + PS.length * (CW + 2) + 30) + "," + (TOP - 8) + ') rotate(-55)">Moyenne</text>' +
        CH.map(function (c, r) { var y = TOP + r * (RH + 2), m = moy(c); return '<text class="rl" x="' + (LW - 10) + '" y="' + (y + RH * 0.68) + '" text-anchor="end">' + esc(c.nom) + "</text>" +
          PS.map(function (p, k) { var a = note(p, c), v = a ? a.note : null; return '<rect x="' + (LW + k * (CW + 2)) + '" y="' + y + '" width="' + CW + '" height="' + RH + '" rx="4" fill="' + (v == null ? "#fcfcfb" : col[String(v)]) + '"><title>' + esc(p.libelle + " · " + c.nom + " : " + (v == null ? "pas d'avis" : LBL[String(v)]) + (a && a.verbatim ? " · " + a.verbatim : "")) + "</title></rect>"; }).join("") +
          (m == null ? "" : '<text class="nv" x="' + (LW + PS.length * (CW + 2) + 54) + '" y="' + (y + RH * 0.68) + '" text-anchor="end">' + sg(m) + "</text>"); }).join("") + "</svg></div>";
      var leg = '<svg class="pleg" viewBox="0 0 560 22" role="img" aria-label="Légende">' + ["-2", "-1", "0", "1", "2"].map(function (k, i) { return '<rect x="' + (i * 112) + '" y="5" width="12" height="12" rx="3" fill="' + col[k] + '"></rect><text x="' + (i * 112 + 18) + '" y="15">' + LBL[k] + "</text>"; }).join("") + "</svg>";
      var rows = CH.map(function (c) { return { c: c, m: moy(c) }; }).filter(function (r) { return r.m != null; }).sort(function (a, b) { return b.m - a.m; });
      var BW = 300, X0 = LW + BW / 2;
      var bars = '<svg class="pbars" viewBox="0 0 ' + (LW + BW + 60) + " " + (rows.length * 28 + 8) + '" role="img" aria-label="Moyenne pondérée par chantier, de −2 à +2">' +
        '<line x1="' + X0 + '" x2="' + X0 + '" y1="0" y2="' + (rows.length * 28 + 8) + '" class="ax"></line>' +
        rows.map(function (r, i) { var y = 4 + i * 28, w = Math.abs(r.m) / 2 * (BW / 2); return '<text class="rl" x="' + (LW - 10) + '" y="' + (y + 15) + '" text-anchor="end">' + esc(r.c.nom) + '</text><rect x="' + (r.m >= 0 ? X0 : X0 - w) + '" y="' + (y + 3) + '" width="' + Math.max(w, 1) + '" height="16" rx="4" fill="' + (r.m >= 0 ? "#2a78d6" : "#c4342d") + '"><title>' + esc(r.c.nom + " : " + sg(r.m)) + '</title></rect><text class="nv" x="' + (LW + BW + 56) + '" y="' + (y + 15) + '" text-anchor="end">' + sg(r.m) + "</text>"; }).join("") + "</svg>";
      var cartes = '<div class="elg">' + (EL.personas || []).map(function (p) { var u = VX[p.id]; return '<div class="el"><b>' + esc(p.libelle) + "</b>" + (p.age ? '<p class="kick">' + esc(p.age) + " ans · " + esc(String(p.lieu || "").split(",")[0]) + "</p>" : "") + (/^https:\/\/elevenlabs\.io\//.test(u || "") ? '<button class="appel" data-appel="' + esc(u) + '">Appeler</button>' : "") + "</div>"; }).join("") + "</div>";
      box.innerHTML = '<div class="thead"><h1>Électeurs simulés</h1><p class="mut">Simulation, pas un sondage. Moyenne pondérée par le poids de chaque profil dans la population.</p></div>' +
        '<section><h2 class="h2">Le programme face aux électeurs</h2>' + bars + "</section>" +
        '<section><h2 class="h2">Chantier par électeur</h2>' + leg + cases + "</section>" +
        '<section><h2 class="h2">Les électeurs</h2>' + cartes + '<p class="mut"><a href="#banque" data-go="banque">Créer un électeur</a></p></section>';
    })();
    // ---------- équipe : contexte de travail, une note à la fois
    PA.ctxBoutons = function (n) {
      if (!n.contexte) return "";
      return '<p class="filters"><button class="chip ctx-cp" data-id="' + esc(n.id) + '">Contexte pour Claude</button> <button class="chip ctx-dl" data-id="' + esc(n.id) + '">Télécharger</button> <span class="mut ctx-m"></span></p>';
    };
    document.addEventListener("click", function (ev) {
      var b = ev.target.closest && ev.target.closest(".ctx-cp, .ctx-dl"); if (!b) return;
      var n = (C.notes_groupe || []).filter(function (x) { return x.id === b.getAttribute("data-id"); })[0]; if (!n) return;
      var m = b.parentNode.querySelector(".ctx-m");
      if (b.classList.contains("ctx-dl")) { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([n.contexte], { type: "text/markdown" })); a.download = "contexte-" + n.id + ".md"; a.click(); return; }
      navigator.clipboard.writeText(n.contexte).then(function () { m.textContent = "Copié : collez-le au début de votre conversation avec Claude."; }, function () { m.textContent = "Copie impossible : téléchargez-le."; });
    });
    (function () {
      var box = el("contexte"); if (!box) return;
      var N = (C.notes_groupe || []).filter(function (n) { return n.contexte; });
      box.innerHTML = '<div class="thead"><h1>Contexte de travail</h1><p class="lead">Pour reprendre une note avec Claude : seulement ce qui sert à cette note. En tête, ce qu\'en disent les autres (Slack et commentaires du site, résumés, jamais intégrés) ; puis ce qui manque, le socle utile et le texte.</p><p class="mut">Avec Claude Code ou Codex dans le dépôt preparer-lavenir, dites « je travaille sur » suivi du titre : le contexte de la note se charge tout seul. Dans l\'application Claude, copiez-le ci-dessous.</p></div>' +
        (N.length ? N.map(function (n) { return '<div class="entree"><span class="kick">' + esc(n.meta.auteur) + '</span><b>' + esc(n.meta.titre) + "</b>" + PA.ctxBoutons(n) + "</div>"; }).join("") : '<p class="mut">Aucune note en cours.</p>');
    })();
    // ---------- 1. messages à débattre : la phrase d'une minute de chaque note et de chaque priorité (débat sur #general-channel)
    (function () {
      var box = el("messages"); if (!box) return;
      var M = C.messages || [];
      box.innerHTML = '<div class="thead"><h1>Messages à débattre</h1><p class="lead">Ce que le candidat dirait en une minute, sujet par sujet. Chaque message est écrit par l\'auteur de la note, au sommet de sa note sourcée. On débat des messages sur Slack, dans #general-channel ; les notes se discutent ici.</p></div>' +
        (M.length ? M.map(function (m) { return '<details class="mes"><summary><div class="mt">' + esc(m.phrase) + '</div><p class="verd">' + esc(m.source) + (m.auteur ? " · " + esc(m.auteur) : "") + "</p></summary><div class=\"mb\">" + (m.minute ? '<div class="lire"><p>' + esc(m.minute) + "</p></div>" : '<p class="mut">Pas encore de version d\'une minute.</p>') + PA.testBox(m.minute || m.phrase, m.source) + '<p><a href="#' + esc(m.lien) + '" data-go="' + esc(m.lien.split("/")[0]) + '"' + (m.lien.indexOf("/") > 0 ? ' data-sub="' + esc(m.lien.split("/")[1]) + '"' : "") + ">Voir la source du message</a></p></div></details>"; }).join("") : '<p class="mut">Aucun message pour l\'instant. Écrivez le vôtre en tête de votre note (le soundbite, dans un encadré), puis « Vérifier ma note ».</p>');
    })();
    // ---------- 1. récit et discours
    var PY = C.pyramide || {};
    var illus = function (h) {
      var EL = C.electeurs || { personas: [] }, VX = C.voix || {};
      return h.replace(/<p>\{\{pyramide\}\}<\/p>/, function () { return '<div class="pyrg pyrs">' + PA.svgPyr + '<ol class="etl">' + PA.etages.map(function (e, i) { return '<li><a href="#' + e.id + '" data-go="' + e.id + '"><span class="kick">' + (i + 1) + "</span><b>" + esc(e.t) + "</b><span>" + esc(e.s) + "</span></a></li>"; }).join("") + "</ol></div>"; })
        .replace(/<p>\{\{schema\}\}<\/p>/, function () { return C.note_ia && C.note_ia.methode ? '<figure class="schema"><img src="' + C.note_ia.methode + '" alt="Schéma : le programme et les adversaires passent par trois revues (études académiques, institutions, international), puis par un registre de preuves ; verdicts et fiches, rédaction, site, relecture humaine qui corrige le registre chaque jour."></figure>' : ""; })
        .replace(/<p>\{\{electeurs\}\}<\/p>/, function () { return '<div class="elg els">' + EL.personas.map(function (p) { var u = VX[p.id]; return '<div class="el"><b>' + esc(p.libelle) + "</b>" + (p.age ? '<p class="kick">' + esc(p.age) + " ans</p>" : "") + (/^https:\/\/elevenlabs\.io\//.test(u || "") ? '<button class="appel" data-appel="' + esc(u) + '">Appeler</button>' : "") + "</div>"; }).join("") + '</div><p class="mut">Simulation, pas un sondage. <a href="#banque" data-go="banque">Créer un électeur</a> · <a href="#priorites" data-go="priorites">Voir leurs réactions aux priorités</a></p>'; });
    };
    var texte = function (id, o, titre) { // page = texte modifiable
      var box = el(id); if (!o || !o.md) { box.innerHTML = '<p class="mut">Texte à venir.</p>'; return; }
      box.innerHTML = '<p class="kick">Proposition du groupe, non arbitrée · ' + esc(fdate(o.maj)) + "</p>" + '<div class="lire">' + illus(rich(o.md)) + '</div><p class="filters"><button class="chip pe">Modifier ou commenter ce texte</button></p><div class="pedit"></div>';
      $(".pe", box).addEventListener("click", function () { var h = $(".pedit", box), l = $(".lire", box), on = !l.hidden; l.hidden = on; if (on) doc(h, { id: id, titre: titre, fichier: o.fichier, md: o.md }); else h.innerHTML = ""; this.textContent = on ? "Revenir à la lecture" : "Modifier ou commenter ce texte"; });
    };
    texte("recit", PY.recit, "Le récit");
    el("recit").insertAdjacentHTML("beforeend", '<p class="suite"><a href="#priorites" data-go="priorites">Étage suivant : les éléments de langage</a></p>');
    el("discours").innerHTML = '<div class="thead"><h1>Discours</h1><p class="mut">Projets, non validés. Les annonces ne sont pas arrêtées.</p></div>' + (PY.discours || []).map(function (d) { return '<details class="mes"><summary><div class="mt">' + esc(d.titre) + '</div><p class="verd">Version du ' + esc(fdate(d.maj)) + '</p></summary><div class="mb lire">' + rich(d.md, 1) + "</div></details>"; }).join("");

    // ---------- 2. priorités : tableau des tests sur les électeurs simulés
    (function () {
      var EL = C.electeurs, PR = C.priorites; if (!EL || !PR || !el("priorites")) return;
      var PT = C.tests_priorites, PS = EL.personas.filter(function (p) { return EL.sims[p.id]; }), W = EL.poids || {};
      var f = function (v) { if (v != null && Math.abs(v) < 0.05) v = 0; return v == null ? "" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1).replace(".", ","); }, cl = function (v) { return v == null ? "" : v >= 0.5 ? "r-p" : v <= -0.5 ? "r-m" : "r-0"; };
      var moy = function (vs) { var t = 0, s = 0; PS.forEach(function (p, i) { if (vs[i] != null) { var w = W[p.id] || 0; t += w; s += w * vs[i]; } }); return t ? s / t : null; };
      var tab = function (list, note) { return '<div class="hwrap"><table class="heat tests"><thead><tr><th>' + note + "</th><th>Moyenne</th>" + PS.map(function (p) { return "<th>" + esc(p.libelle) + "</th>"; }).join("") + "</tr></thead><tbody>" + list.map(function (r) { return "<tr><th>" + esc(r.t) + ' <span class="mut">' + numLk(r.nums) + '</span></th><td class="' + cl(r.m) + '"><b>' + f(r.m) + "</b></td>" + r.v.map(function (v) { return '<td class="' + cl(v) + '">' + (v == null ? "" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v)) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>"; };
      var h = '<section class="tst"><h2 class="h2">Les priorités à l\'épreuve des électeurs simulés</h2><p class="mut">De −2 (rejet) à +2 (adhésion). Moyenne pondérée par le poids de chaque profil dans la population. Simulation, pas un sondage : elle repère les objections, elle ne prédit pas un vote.</p>';
      if (PT) {
        var rows = PT.items.map(function (it) { var v = PS.map(function (p) { var x = ((PT.resultats[p.id]) || []).filter(function (y) { return y.id === it.id; })[0]; return x ? x.reaction : null; }); return { id: it.id, t: it.titre, nums: it.nums, v: v, m: moy(v) }; }).sort(function (a, b) { return (b.m || 0) - (a.m || 0); });
        h += tab(rows, "Priorité du groupe") + rows.map(function (r) { return '<details class="in"><summary>' + esc(r.t) + " : ce qui porte, ce qui fait décrocher</summary>" + PS.map(function (p) { var x = (PT.resultats[p.id] || []).filter(function (y) { return y.id === r.id; })[0]; return x ? "<p><b>" + esc(p.libelle) + "</b> (" + (x.reaction > 0 ? "+" : "") + x.reaction + "). Porte : " + esc(x.porte) + " Décroche : " + esc(x.decroche) + " <i>Le convaincrait : " + esc(x.convaincrait) + "</i></p>" : ""; }).join("") + "</details>"; }).join("") + '<p class="mut">' + esc(PT.methode) + "</p>";
      }
      var cm = (EL.mesures_communes || []).map(function (n) { var v = PS.map(function (p) { var x = (EL.sims[p.id].mesures || []).filter(function (y) { return y.num === n; })[0]; return x ? x.reaction : null; }); return { t: byNum[n].titre.replace(/\.$/, ""), nums: [n], v: v, m: moy(v) }; }).sort(function (a, b) { return (b.m || 0) - (a.m || 0); });
      if (cm.length) h += '<details class="in"><summary>Les dix mesures du livret lues par tous les électeurs</summary>' + tab(cm, "Mesure du livret") + "</details>";
      h += '<p><a href="#banque" data-go="banque">Appeler un électeur, ou en créer un</a></p></section>';
      var head = $(".thead", el("priorites")); if (head) head.insertAdjacentHTML("afterend", h);
    })();

    // ---------- 2. banque d'électeurs et atelier de personas
    (function () {
      var EL = C.electeurs || { personas: [] }, VX = C.voix || {}, box = el("banque");
      var appel = function (u) { return /^https:\/\/elevenlabs\.io\//.test(u || "") ? u : null; };
      var carte = function (p) { return '<div class="el"><p class="kick">' + esc(p.sur || "") + "</p><b>" + esc(p.nom) + "</b><p>" + esc(p.desc || "") + "</p>" + (p.lien ? '<button class="appel" data-appel="' + esc(p.lien) + '">Appeler</button>' : '<span class="mut">voix à venir</span>') + (p.note ? '<span class="mut">' + esc(p.note) + "</span>" : "") + (p.prompt ? '<button class="lien" data-base="' + esc(p.base) + '">Partir de ce profil</button>' : "") + "</div>"; };
      var base = EL.personas.map(function (p) { return { nom: p.libelle, sur: [p.age ? p.age + " ans" : "", (p.lieu || "").split(/[,(]/)[0]].filter(Boolean).join(" · "), desc: (p.situation || "").split(/[.;]/)[0].trim() + ".", lien: appel(VX[p.id]), note: VX[p.id] ? "Agent commun : demandez « " + p.libelle + " »." : "", prompt: 1, base: p.id }; });
      var cree = (C.banque || []).filter(function (b) { return appel(b.lien) && b.auteur && b.type !== "commun"; }).map(function (b) { return { nom: b.libelle, sur: "Créé par " + b.auteur, desc: b.description || "", lien: b.lien }; });
      var vote = ["Édouard Philippe", "Marine Le Pen", "Jean-Luc Mélenchon", "David Lisnard", "Bruno Retailleau", "Raphaël Glucksmann", "Gabriel Attal", "Abstention", "Indécis"];
      var champ = function (id, lab, ph, big) { return '<label>' + lab + (big ? '<textarea id="ps-' + id + '" rows="' + big + '" placeholder="' + esc(ph) + '"></textarea>' : '<input id="ps-' + id + '" placeholder="' + esc(ph) + '">') + "</label>"; };
      box.innerHTML = '<div class="thead"><h1>Électeurs à appeler</h1><p class="lead">Cliquez pour parler à un électeur simulé. Ou créez le vôtre : le site écrit le prompt, vous le corrigez, l\'agent vocal revient ici sous forme de lien.</p><p class="mut">Personnages fictifs construits sur des données publiques. Ce ne sont ni des personnes réelles ni un sondage. Les appels utilisent des crédits limités.</p></div>' +
        '<div class="elg" id="bq">' + cree.map(carte).join("") + base.map(carte).join("") + "</div>" +
        '<section id="atelier"><h2 class="h2">Créer un électeur</h2>' + connexion() +
        '<ol class="etapes"><li><h4>Décrire</h4><div class="form2">' + '<label>Partir de<select id="ps-base"><option value="">page blanche</option>' + EL.personas.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.libelle) + "</option>"; }).join("") + "</select></label>" + champ("libelle", "Nom du profil (un rôle, pas une personne)", "Infirmière libérale en zone rurale") + champ("age", "Âge", "42") + champ("lieu", "Lieu", "Nièvre, bourg de 2 000 habitants") + champ("situation", "Situation", "Métier, revenus, famille, logement", 2) + champ("vote", "Vote passé", "Macron en 2022, abstention en 2024") +
        '<label>Intention aujourd\'hui<select id="ps-int">' + vote.map(function (v) { return "<option>" + esc(v) + "</option>"; }).join("") + "</select></label>" + champ("preo", "Préoccupations (une par ligne)", "déserts médicaux\nprix de l'essence", 4) + champ("info", "D'où vient son information", "France Bleu, Facebook, collègues") + champ("image", "Son image d'Édouard Philippe", "« La réforme des retraites, mais sérieux »") + champ("ton", "Ton", "Directe, pressée, ironique, jamais caricaturale") +
        '<label>Thèmes du programme qu\'il connaît<select id="ps-th" multiple size="5">' + TH.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.nom) + "</option>"; }).join("") + '</select></label></div><p class="filters"><button class="chip" id="ps-gen">Écrire le prompt</button></p></li>' +
        '<li><h4>Corriger le prompt</h4><textarea id="ps-prompt" rows="16" placeholder="Le prompt apparaît ici. Vous pouvez tout changer."></textarea><p class="mut"><span id="ps-n">0</span> caractères sur 12 000. Un rappel fixe est ajouté à la création : c\'est une simulation, aucune donnée personnelle, aucune position inventée.</p><label>Première phrase<input id="ps-first" value="Bonjour. Je vous écoute, mais je vous préviens, je ne suis pas convaincu d\'avance."></label><label>Voix (facultatif, identifiant ElevenLabs)<input id="ps-voix" autocomplete="off"></label></li>' +
        '<li><h4>Créer l\'agent</h4><p class="filters"><button class="chip" id="ps-go">Créer l\'agent vocal</button><button class="chip" id="ps-copy">Copier le prompt</button></p><p class="mut" id="ps-msg" role="status"></p></li></ol></section>';
      var v = function (id) { var e = $("#ps-" + id); return e ? e.value.trim() : ""; }, set = function (id, x) { var e = $("#ps-" + id); if (e) e.value = x == null ? "" : x; };
      var cur = null;
      var partir = function (id) {
        cur = EL.personas.filter(function (p) { return p.id === id; })[0] || null; if (!cur) return;
        set("base", id); set("libelle", cur.libelle + " (variante)"); set("age", cur.age); set("lieu", cur.lieu); set("situation", cur.situation); set("vote", cur.vote_passe); set("preo", (cur.preoccupations || []).join("\n")); set("info", cur.sources_info); set("image", cur.image_de_philippe); set("ton", cur.ton);
        var it = $("#ps-int"); for (var i = 0; i < it.options.length; i++) if (String(cur.intention_t1 || "").indexOf(it.options[i].value) >= 0) it.selectedIndex = i;
      };
      var generer = function () {
        var th = Array.prototype.slice.call($("#ps-th").selectedOptions).map(function (o) { return o.value; }), pre = v("preo").split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
        var mots = norm(pre.join(" ")).split(/[^a-z0-9]+/).filter(function (w) { return w.length > 4; });
        var sc = C.philippe.mesures.map(function (m) { var t = norm(m.titre + " " + (m.texte || "")); return { m: m, s: mots.filter(function (w) { return t.indexOf(w) >= 0; }).length + (th.indexOf(m.theme) >= 0 ? 1 : 0) + (cur && (cur.mesures_specifiques || []).indexOf(m.num) >= 0 ? 5 : 0) }; }).filter(function (x) { return x.s > 1 || (x.s > 0 && th.indexOf(x.m.theme) >= 0); }).sort(function (a, b) { return b.s - a.s; }).slice(0, 14).map(function (x) { return x.m; });
        var sim = cur && EL.sims[cur.id], ds = cur && EL.chantiers_avis && EL.chantiers_avis[cur.id] && EL.chantiers_avis[cur.id].doleances || [];
        var L = ["# Personnage", "Tu joues « " + (v("libelle") || "un électeur") + " », un électeur fictif" + (v("age") ? " de " + v("age") + " ans" : "") + (v("lieu") ? ", " + v("lieu") : "") + ". C'est un archétype construit sur des données publiques, pas une personne réelle.", v("situation") && "Situation : " + v("situation"), v("vote") && "Vote passé : " + v("vote"), "Intention aujourd'hui : " + v("int") + ".", v("info") && "Sources d'information : " + v("info"), v("image") && "Image d'Édouard Philippe : " + v("image"), v("ton") && "Ton : " + v("ton"), "", "# Ce qui compte pour toi"].concat(pre.map(function (p) { return "- " + p; }));
        if (ds.length) L = L.concat(["", "# Doléances documentées (chiffres que tu peux citer, avec la source si on la demande)"], ds.slice(0, 6).map(function (d) { return "- " + d.doleance + (d.fait ? " Fait : " + d.fait : "") + (d.source ? " (" + (typeof d.source === "string" ? d.source : d.source.titre || "") + ")" : ""); }));
        if (sc.length) L = L.concat(["", "# Mesures du programme d'Édouard Philippe que tu connais (livret du 18 novembre 2026)"], sc.map(function (m) { var r = sim && (sim.mesures || []).filter(function (x) { return x.num === m.num; })[0]; return "- N°" + m.num + " " + m.titre.replace(/\.$/, "") + "." + (r && r.objection ? " Ta réaction de départ : " + r.objection : ""); }));
        L = L.concat(["", "# Déroulé", "1. Tu te présentes en une phrase, puis tu laisses parler ton interlocuteur.", "2. Quand il te soumet une mesure ou un message, tu réponds en trois temps : ce qui te parle, ce qui te fait décrocher et pourquoi, à partir de ta vie ; puis comment il faudrait te le dire.", "3. Tu donnes une note d'intérêt sur 10 et tu dis si cela te ferait hésiter dans ton vote.", "4. Tu peux être convaincu par une réponse concrète, chiffrée et juste. Tu ne changes pas d'avis par politesse.", "", "# Règles", "Réponses courtes, deux à quatre phrases, c'est une conversation orale en français. Aucun chiffre absent de ce prompt. Aucune position inventée pour un candidat. Pas de propos haineux, pas de caricature."]);
        $("#ps-prompt").value = L.filter(function (x) { return x !== "" && x !== undefined && x !== null && x !== false || x === ""; }).join("\n"); compte();
      };
      var compte = function () { $("#ps-n").textContent = $("#ps-prompt").value.length; };
      $("#ps-base").addEventListener("change", function () { partir(this.value); });
      $("#ps-gen").addEventListener("click", generer); $("#ps-prompt").addEventListener("input", compte);
      var msg = function (s) { $("#ps-msg").textContent = s; };
      $("#ps-copy").addEventListener("click", function () { if (navigator.clipboard) navigator.clipboard.writeText($("#ps-prompt").value).then(function () { msg("Prompt copié."); }, function () { msg("Copie impossible dans ce navigateur."); }); });
      $("#ps-go").addEventListener("click", function () {
        var p = $("#ps-prompt").value.trim(); if (p.length < 200) { msg("Écrivez d'abord le prompt (200 caractères au moins)."); return; } if (p.length > 12000) { msg("Prompt trop long : 12 000 caractères au plus."); return; } if (!v("libelle")) { msg("Donnez un nom au profil."); return; }
        envoi("persona", v("libelle"), "Création d'un électeur simulé : " + v("libelle"), { libelle: v("libelle"), prompt: p, premier_message: v("first"), voix_id: v("voix") }, msg).then(function (x) { if (!x) return; msg("Demande n° " + x.number + " envoyée. L'agent est créé en une à deux minutes…"); var k = 0, tm = setInterval(function () { k++; vivants(true).then(function (ok) { if (ok.indexOf(x.number) >= 0) { clearInterval(tm); msg("Agent créé : il est en haut de la page."); } else if (k > 14) { clearInterval(tm); msg("Toujours en attente : rechargez la page dans quelques minutes, ou ouvrez la demande n° " + x.number + " dans le dépôt."); } }); }, 15000); });
      });
      var vivants = function (force) {
        return fils(force).then(function (xs) {
          var dem = xs.filter(function (x) { return x.type === "persona" && x.rep; }).slice(0, 20), deja = {}; (C.banque || []).forEach(function (b) { deja[b.agent_id] = 1; });
          return Promise.all(dem.map(function (x) { return api("/issues/" + x.n + "/comments").then(function (cs) { var j = cs.filter(function (c) { return c.user && /\[bot\]$/.test(c.user.login); }).map(function (c) { return parse(c.body); }).filter(function (o) { return o && appel(o.lien); })[0]; if (!j) return null; if (!deja[j.agent_id] && !$('[data-appel="' + CSS.escape(j.lien) + '"]', $("#bq"))) $("#bq").insertAdjacentHTML("afterbegin", carte({ nom: j.libelle || x.j.libelle, sur: "Créé par " + x.j.auteur, desc: "", lien: j.lien })); return x.n; }, function () { return null; }); })).then(function (a) { return a.filter(Boolean); });
        }, function () { return []; });
      };
      PA.routes.banque = function () { vivants(); };
      document.addEventListener("click", function (ev) {
        var a = ev.target.closest && ev.target.closest("[data-appel]"); if (a) { window.open(a.getAttribute("data-appel"), "_blank", "noopener,width=430,height=760"); return; }
        var b = ev.target.closest && ev.target.closest("[data-base]"); if (b) { partir(b.getAttribute("data-base")); $("#atelier").scrollIntoView({ block: "start" }); }
      });
    })();

    // ---------- 3. propositions par thème
    (function () {
      var box = el("propositions"), PR = (C.sources_index || []).filter(function (x) { return x.categorie === "proposition"; });
      var cur = "", q = "";
      var render = function () {
        var th = TH.filter(function (t) { return !cur || t.id === cur; });
        $("#pr-out").innerHTML = th.map(function (t) {
          var xs = PR.filter(function (x) { return x.theme === t.id && (!q || norm(x.titre + " " + (x.texte || "")).indexOf(q) >= 0); });
          if (!xs.length) return "";
          return '<section class="prt"><h2 class="h2">' + esc(t.nom) + ' <span class="mut">' + xs.length + '</span></h2><p class="mut"><a href="#' + t.id + '" data-go="' + t.id + '">Commencer par ce qu\'il faut changer dans ce thème</a></p>' + (cur ? xs : xs.slice(0, 5)).map(function (x) { return '<details class="mes prd" data-ch="' + esc(x.chemin) + '"><summary><div class="mh"><span class="num">' + esc(x.auteur || x.auteurs || "Groupe") + "</span>" + (x.mesures || []).slice(0, 5).map(function (n) { return '<span class="num">N°' + esc(n) + "</span>"; }).join("") + '</div><div class="mt">' + esc(x.titre) + "</div>" + '</summary><div class="mb"></div></details>'; }).join("") + (!cur && xs.length > 5 ? '<p><button class="chip" data-th="' + t.id + '">Voir les ' + xs.length + " propositions</button></p>" : "") + "</section>";
        }).join("") || '<p class="mut">Aucune proposition ne correspond.</p>';
        $$("#pr-f .chip").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-th") === cur); });
        $$(".prd", box).forEach(function (d) { d.addEventListener("toggle", function () { var h = $(".mb", d); if (!d.open || h.innerHTML) return; var x = PR.filter(function (y) { return y.chemin === d.getAttribute("data-ch"); })[0]; h.innerHTML = '<div class="lire">' + rich(x.texte || x.resume, 2) + "</div>" + (x.mesures && x.mesures.length ? '<p class="mut">S\'appuie sur : ' + numLk(x.mesures) + "</p>" : "") + '<p class="filters"><button class="chip pe2">Modifier ou commenter</button></p><div class="pedit"></div>'; $(".pe2", h).addEventListener("click", function () { var l = $(".lire", h), on = !l.hidden; l.hidden = on; if (on) doc($(".pedit", h), { id: x.chemin, titre: x.titre, fichier: x.chemin, md: x.texte || "" }); else $(".pedit", h).innerHTML = ""; this.textContent = on ? "Revenir à la lecture" : "Modifier ou commenter"; }); }); });
      };
      box.innerHTML = '<div class="thead"><h1>Nos propositions</h1><p class="lead">Ce que le groupe ajoute au programme, construit sur les analyses de chaque mesure. Rien n\'est arbitré.</p></div><div class="filters" id="pr-f"><button class="chip" data-th="">Tout</button>' + TH.map(function (t) { return '<button class="chip" data-th="' + t.id + '">' + esc(t.court) + ' <span class="tn">' + PR.filter(function (x) { return x.theme === t.id; }).length + "</span></button>"; }).join("") + '<input type="search" id="pr-q" placeholder="Chercher une proposition"></div><div id="pr-out"></div>';
      box.addEventListener("click", function (ev) { var b = ev.target.closest("button[data-th]"); if (!b) return; cur = b.getAttribute("data-th"); render(); if (!b.closest("#pr-f")) window.scrollTo(0, 0); });
      $("#pr-q").addEventListener("input", function () { q = norm(this.value.trim()); render(); });
      PA.routes.propositions = function (s) { if (s !== undefined && s !== cur) { cur = s || ""; render(); } };
      render();
    })();

    // ---------- 3. notes en discussion
    (function () {
      var N = C.notes_groupe || [], box = el("notes");
      var tb = function (h, rows) { return '<div class="hwrap"><table class="heat txt"><thead><tr>' + h.map(function (x) { return "<th>" + esc(x) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div>"; };
      var place = function (p) { if (!p) return ""; return '<section><h2 class="h2">' + esc(p.titre) + '</h2><p class="lead2">' + lk(esc(p.lecture)) + '</p><div><div><h4>Dans le programme d\'Édouard Philippe</h4>' + tb(["Mesure", "Lien", "Pourquoi"], p.philippe.map(function (x) { var m = byNum[x.num]; return "<tr><td>" + numLk([x.num]) + " " + esc(m ? m.titre.replace(/\.$/, "") : "") + "</td><td>" + esc(x.lien) + "</td><td>" + lk(esc(x.texte)) + "</td></tr>"; })) + "</div><div><h4>Face aux autres candidats</h4>" + tb(["Candidat", "Position", "Ce qu'il propose"], p.rivaux.map(function (x) { return "<tr><td>" + esc(x.qui) + "</td><td>" + esc(x.lien) + "</td><td>" + esc(x.texte) + '<br><span class="mut">' + esc(x.source || "") + "</span></td></tr>"; })) + "</div></div></section>"; };
      var verif = function (v) { if (!v) return ""; return '<section><h2 class="h2">Vérification et valeur ajoutée</h2><p class="lead2">' + lk(esc(v.synthese)) + "</p><p>" + lk(esc(v.priorite || "")) + "</p>" + '<details class="in"><summary>Proposition par proposition</summary>' + tb(["Proposition", "Verdict", "Ce qui existe déjà", "À faire"], (v.propositions || []).map(function (p) { return "<tr><td>" + esc(p.n + ". " + p.titre) + "</td><td>" + esc(p.verdict) + "</td><td>" + lk(esc(p.pourquoi)) + "</td><td>" + lk(esc(p.a_faire)) + "</td></tr>"; })) + '</details><details class="in"><summary>Faits vérifiés</summary>' + tb(["Affirmation", "Statut", "Détail"], (v.faits || []).map(function (f) { return "<tr><td>" + esc(f.affirmation) + "</td><td>" + esc(f.statut) + "</td><td>" + lk(esc(f.detail)) + "</td></tr>"; })) + '</details><details class="in"><summary>Ailleurs et sources</summary><p>' + esc(v.ailleurs || "") + "</p><ul>" + (v.sources || []).map(function (s) { return "<li>" + inline(s) + "</li>"; }).join("") + "</ul></details></section>"; };

      var msgNote = function (n) {
        var m = n.socle && n.socle.message; if (!m) return '<p class="mut">Pas encore vérifiée.</p>';
        return '<section><h2 class="h2">Le soundbite (première puce)</h2><p class="lead2">' + (m.une_phrase ? esc(m.une_phrase) : '<span class="mut">À écrire par vous : le soundbite, en tête de la note, dans un encadré.</span>') + '</p><h2 class="h2">Le message en une minute</h2>' + (m.une_minute ? '<div class="lire"><p>' + esc(m.une_minute) + '</p></div><p class="mut">' + m.mots + ' mots (160 au plus).</p>' : '<p class="mut">Le soundbite : ce que le candidat dirait en une minute, 6 à 8 puces courtes, écrites par l\'auteur.</p>') + (m.une_phrase ? PA.testBox(m.une_minute || m.une_phrase, n.meta.titre) : "") + '<p class="mut">Le message se débat sur Slack, dans #general-channel, pas la note entière. <a href="#messages" data-go="messages">Tous les messages à débattre</a></p></section>';
      };
      var socle = function (s) {
        if (!s) return '<p class="mut">Pas encore vérifiée.</p>';
        return '<section><h2 class="h2">Le socle de la note</h2><p class="mut">Les sources et les programmes les plus proches du texte : proximité de mots, à qualifier en lisant.</p><h4>Littérature et analyses</h4><ul>' + s.litterature.map(function (x) { return "<li>" + esc(x.titre) + (x.auteurs ? ' <span class="mut">' + esc(x.auteurs + " " + x.annee) + "</span>" : "") + "</li>"; }).join("") + '</ul><h4>Programmes de tous les partis</h4>' + tb(["Candidat", "Positions les plus proches"], Object.keys(s.programmes).map(function (c) { return "<tr><td>" + esc(c) + "</td><td>" + s.programmes[c].map(function (x) { return esc(x.titre); }).join("<br>") + "</td></tr>"; })) +
          (s.a_faire.length ? '<h4>À faire</h4><ul>' + s.a_faire.map(function (a) { return "<li>" + inline(esc(a)) + "</li>"; }).join("") + "</ul>" : "") + "</section>";
      };

      var slackNote = function (v) {
        var m = v.message || {}, cs = Object.keys(v.programmes || {});
        return "*Message à débattre* : « " + (m.une_phrase || "à écrire") + " »\n" + (m.une_minute ? "_En une minute_ : " + m.une_minute + "\n" : "") +
          "*Note* : " + (v.titre || "") + (v.doc ? " · " + v.doc : "") + "\n" +
          "*Analyse* : s'appuie sur " + (v.litterature || []).slice(0, 3).map(function (x) { return x.titre; }).join(" ; ") + (cs.length ? ". Face aux programmes : " + cs.join(", ") : "") + ".\n" +
          ((v.a_faire || []).length ? "*À faire* : " + v.a_faire.join(" ") + "\n" : "") + "On débat du message en fil, sous ce post.";
      };
      var formNote = function () {
        return '<section id="vn"><h2 class="h2">Vérifier ma note</h2><p class="mut">Collez votre note (Markdown). Elle est confrontée au socle : littérature, programmes de tous les partis, propositions du groupe. Le rapport arrive en quelques minutes dans le fil de discussion de la note. Mettez en tête votre soundbite, dans un encadré : ce que le candidat dirait en une minute, 6 à 8 puces. Puis le constat (ce que proposent les candidats, Édouard Philippe d\'abord) et vos propositions.</p>' + connexion() +
          '<div class="form2"><label>Titre<input id="vn-titre" placeholder="THÈME : la proposition"></label><label>Thème<select id="vn-theme">' + TH.map(function (t) { return '<option value="' + t.id + '">' + esc(t.nom) + "</option>"; }).join("") + '</select></label><label>Lien du Google Doc (dossier partagé du groupe, commentable par tous)<input id="vn-doc" type="url" placeholder="https://docs.google.com/document/d/…"></label><label>La note<textarea id="vn-texte" rows="14"></textarea></label></div><p class="filters"><button class="chip" id="vn-go">Vérifier</button></p><p class="mut" id="vn-msg" role="status"></p><div id="vn-liste"></div></section>';
      };
      var mesNotes = function () {
        var b = $("#vn-liste", box); if (!b) return;
        fils().then(function (xs) { var ns = xs.filter(function (x) { return x.type === "note"; }); b.innerHTML = ns.length ? "<h4>Notes envoyées</h4>" + ns.map(function (x) { return '<details class="in" data-n="' + x.n + '"><summary>' + esc(x.j.titre || "Note") + " · " + esc(x.j.auteur || "") + " · " + esc(fdate(x.date.slice(0, 10))) + (x.rep ? " · rapport prêt" : " · vérification en cours") + '</summary><div class="rap"></div></details>'; }).join("") : "";
          $$("details[data-n]", b).forEach(function (d) { d.addEventListener("toggle", function () { var r = $(".rap", d); if (!d.open || r.innerHTML) return; r.textContent = "Chargement…"; api("/issues/" + d.getAttribute("data-n") + "/comments").then(function (cs) { var v = null; cs.forEach(function (c) { var y = parse(c.body); if (y && y.message) v = y; }); if (!v) { r.textContent = "Rapport pas encore prêt."; return; } r.innerHTML = socle(v) + '<p class="filters"><button class="chip cp">Copier pour Slack</button></p><p class="mut cpm" role="status"></p>'; $(".cp", r).addEventListener("click", function () { navigator.clipboard.writeText(slackNote(v)).then(function () { $(".cpm", r).textContent = "Copié. Collez-le dans #general-channel."; }, function () { $(".cpm", r).textContent = "Copie impossible : sélectionnez le texte à la main."; }); }); }, function (e) { r.textContent = "Rapport illisible (" + e.message + ")."; }); }); }); }, function () { b.innerHTML = ""; });
      };
      var liste = function () { box.innerHTML = '<div class="thead"><h1>Notes en discussion</h1><p class="lead">Les notes des membres, modifiables et commentables ici, situées parmi les autres propositions.</p></div>' + (N.map(function (n) { return '<a class="entree" href="#notes/' + esc(n.id) + '" data-go="notes" data-sub="' + esc(n.id) + '"><span class="kick">' + esc(n.meta.auteur) + " · " + esc(fdate(n.maj)) + (n.meta.statut === "discussion" ? " · en discussion" : "") + "</span><b>" + esc(n.meta.titre) + "</b><span>" + esc(n.verif ? String(n.verif.priorite || n.verif.synthese) : "") + "</span></a>"; }).join("") || '<p class="mut">Aucune note en discussion.</p>') + formNote();
        $("#vn-go", box).addEventListener("click", function () { var g = function (k) { return $("#vn-" + k, box).value.trim(); }, msg = function (s) { $("#vn-msg", box).textContent = s; }; if (!g("titre") || g("texte").length < 200) { msg("Il faut un titre et le texte de la note."); return; } envoi("note", g("titre"), "Note proposée à la vérification : " + g("titre"), { titre: g("titre"), theme: g("theme"), texte: g("texte"), doc: g("doc") }, msg).then(function (x) { if (x) { msg("Envoyée (n° " + x.number + "). Le rapport arrive dans quelques minutes."); mesNotes(); } }); });
        mesNotes(); };
      var page = function (n) {
        var th = TH.filter(function (t) { return t.id === n.meta.theme; })[0];
        box.innerHTML = '<p class="fil"><a href="#notes" data-go="notes">Notes en discussion</a>' + (th ? ' · <a href="#' + th.id + '" data-go="' + th.id + '">' + esc(th.nom) + "</a>" : "") + '</p><div class="thead"><h1>' + esc(n.meta.titre) + '</h1><p class="kick">' + esc(n.meta.auteur) + " · " + esc(fdate(n.maj)) + (n.meta.version ? " · version " + esc(n.meta.version) : "") + '</p></div>' + PA.ctxBoutons(n) + '<p class="mut">Une note se lit comme la pyramide : en haut le message d\'une minute, au milieu la note, en bas le socle (littérature et programmes de tous les partis).</p><nav class="subtabs nt"><button data-v="message">1. Le message</button><button data-v="note" aria-selected="true">2. La note</button><button data-v="place">3. Face aux programmes</button><button data-v="socle">4. Le socle</button><button data-v="verif">Vérification</button>' + (n.avant ? '<button data-v="avant">Version de l\'auteur</button>' : "") + '</nav><div data-nv="message" hidden>' + msgNote(n) + '</div><div data-nv="socle" hidden>' + socle(n.socle) + '</div><div data-nv="note"></div><div data-nv="place" hidden>' + place(n.place) + '</div><div data-nv="verif" hidden>' + verif(n.verif) + '</div><div data-nv="avant" hidden><p class="mut">Texte reçu de l\'auteur, inchangé.</p><div class="lire">' + rich(n.avant || "", 1) + "</div></div>";
        doc($('[data-nv="note"]', box), { id: n.id, titre: n.meta.titre, fichier: n.fichier, md: n.md });
        $$(".nt button", box).forEach(function (b) { b.addEventListener("click", function () { $$(".nt button", box).forEach(function (c) { c.setAttribute("aria-selected", c === b); }); $$("[data-nv]", box).forEach(function (x) { x.hidden = x.getAttribute("data-nv") !== b.getAttribute("data-v"); }); }); });
      };
      var vue = null;
      PA.routes.notes = function (s) { if (vue === (s || "")) return; vue = s || ""; var n = N.filter(function (x) { return x.id === s; })[0]; if (n) page(n); else liste(); };
    })();

    // ---------- 4. thème : ce qu'il faut changer, tout de suite
    var ANL = C.philippe.analyses, PROPS = (C.sources_index || []).filter(function (x) { return x.categorie === "proposition"; });
    var fragile = function (a, b) { return (a._sol == null ? 60 : a._sol) - (b._sol == null ? 60 : b._sol) || b._expo - a._expo; };
    var solide = function (m) { return m._v[0] === "solide"; };
    var aChanger = function (t) { return t.mes.filter(function (m) { return !solide(m) && PA.mieux(m, ANL, C); }).sort(fragile); };
    TH.forEach(function (t) {
      var box = $("#p-" + t.id + ' [data-p="changer"]'); if (!box) return;
      $("#p-" + t.id).classList.add("fmt");
      var ch = aChanger(t), so = t.mes.filter(solide), re = t.mes.filter(function (m) { return !solide(m) && !PA.mieux(m, ANL, C); }).sort(fragile);
      var np = PROPS.filter(function (x) { return x.theme === t.id; }).length;
      var cd = function (m) { return ctx.card(m).replace(' id="m' + m.num + '"', ""); };
      box.innerHTML = '<p class="suite0">' + plural(ch.length, "correction") + " sur " + t.mes.length + " mesures, les plus fragiles d'abord" + (np ? ' · <a href="#propositions/' + t.id + '" data-go="propositions" data-sub="' + t.id + '">' + plural(np, "proposition") + " du groupe en plus</a>" : "") + "</p>" +
        ch.map(cd).join("") +
        (so.length ? '<h2 class="h2">À garder : bien fondées (' + so.length + ")</h2>" + so.map(cd).join("") : "") +
        (re.length ? '<details class="in reste"><summary>' + plural(re.length, "mesure") + " dont la correction reste à écrire</summary>" + re.map(cd).join("") + "</details>" : "");
    });
    if (el("preparation")) el("preparation").classList.add("fmt");

    // ---------- 4. analyse : vue d'ensemble
    (function () {
      var PRn = (C.sources_index || []).filter(function (x) { return x.categorie === "proposition"; });
      el("analyse").classList.add("fmt");
      el("analyse").innerHTML = '<div class="thead"><h1>Ce qu\'il faut changer</h1><p class="lead">Les corrections les plus urgentes, thème par thème. Cliquez sur une mesure pour l\'analyse complète.</p></div>' + TH.map(function (t) {
        var ch = aChanger(t);
        return '<section class="anth"><h2 class="h2"><a href="#' + t.id + '" data-go="' + t.id + '">' + esc(t.nom) + "</a></h2>" + ctx.vbar(t.an) + ch.slice(0, 3).map(function (m) { var x = PA.mieux(m, ANL, C); return '<a class="corrige v-' + m._v[0] + '" href="#' + t.id + '" data-n="' + m.num + '"><span class="mh"><span class="num">N°' + m.num + "</span>" + ctx.badge(m._v[0]) + '</span><b>' + esc(m.titre) + '</b><span class="mieux"><b>' + x.k + " :</b> " + inline(x.t) + "</span></a>"; }).join("") + '<p><a href="#' + t.id + '" data-go="' + t.id + '">' + (ch.length > 3 ? "Les " + ch.length + " corrections du thème" : "Ouvrir le thème") + "</a></p></section>";
      }).join("") + '<p class="suite"><a href="#chiffrage" data-go="chiffrage">Chiffrage</a> · <a href="#fiches" data-go="fiches">Ce qui changerait pour…</a> · <a href="#methode" data-go="methode">Méthode et verdicts</a></p><details class="mes"><summary><div class="mt">Tableau de bord : mesures phares, à corriger en priorité, échéances, notes reçues</div></summary><div class="mb">' + (PA.tableau || "") + "</div></details>";
    })();

    // ---------- éducation (education.js)
    if (PA.edu && C.education) {
      var fait = {};
      var edu = function (s, opt) { var b = el("edu-" + s); try { if (s === "international") PA.edu.renderInternational(ctx, b); else if (s === "boussole") PA.edu.renderBoussole(ctx, b); else if (s === "tester") { if (PA.edu.renderTester) PA.edu.renderTester(ctx, b); } else if (s === "prop") PA.edu.renderPropositions(ctx, b, null); else PA.edu.renderTheme(ctx, s, b, opt || {}); } catch (e) { console.error("[education]", s, e); b.innerHTML = '<p class="mut">Contenu indisponible.</p>'; } fait[s] = 1; };
      ["ecole", "handicap", "orientation", "voiepro", "international", "boussole", "tester", "prop"].forEach(function (s) { PA.routes["edu-" + s] = function (x) { if (!fait[s]) edu(s); }; });
      PA.edu.onNavigate = function (s, sec, carte) { fait[s] = 1; go("edu-" + s); edu(s, { section: sec, carte: carte }); };
    }

    // ---------- réseaux
    texte("reseaux", PY.reseaux, "Stratégie sur les réseaux");
    if (PY.videos) el("reseaux").insertAdjacentHTML("beforeend", '<details class="mes"><summary><div class="mt">Huit scripts de vidéos courtes</div><p class="verd">Projet, à valider par l\'équipe de campagne</p></summary><div class="mb lire">' + rich(PY.videos.md, 1) + "</div></details>");

    // ---------- sources
    (function () {
      var SI = (C.sources_index || []).filter(function (x) { return x.categorie !== "proposition"; }), box = el("sources"), st = { c: "litterature", th: "", q: "" }, N = 60;
      var CAT = [["litterature", "Littérature"], ["programme", "Programmes des candidats"], ["analyse", "Nos analyses"]];
      box.innerHTML = '<div class="thead"><h1>Sources</h1><p class="lead">Tout ce sur quoi s\'appuient les analyses, rangé par thème.</p></div><div class="filters" id="so-c">' + CAT.map(function (c) { return '<button class="chip" data-c="' + c[0] + '">' + c[1] + ' <span class="tn">' + SI.filter(function (x) { return x.categorie === c[0]; }).length + "</span></button>"; }).join("") + '</div><div class="filters" id="so-t"><button class="chip" data-t="">Tous les thèmes</button>' + TH.map(function (t) { return '<button class="chip" data-t="' + t.id + '">' + esc(t.court) + "</button>"; }).join("") + '</div><p class="filters"><input type="search" id="so-q" placeholder="Auteur, titre, sujet"></p><div id="so-out"></div>' +
        '<section id="so-add"><h2 class="h2">Ajouter une source</h2><p class="mut">Une source par fiche. Le chiffre doit avoir été lu dans la source. Elle apparaît après vérification automatique.</p>' + connexion() + '<div class="form2"><label>Titre<input id="as-titre"></label><label>Auteurs<input id="as-auteurs"></label><label>Année<input id="as-annee" inputmode="numeric"></label><label>Type<select id="as-type"><option value="causal">causal</option><option value="descriptif">descriptif</option><option value="rapport">rapport</option><option value="programme">programme</option><option value="presse">presse</option></select></label><label>Lien<input id="as-url" type="url"></label><label>Thème<select id="as-theme">' + TH.map(function (t) { return '<option value="' + t.id + '">' + esc(t.nom) + "</option>"; }).join("") + '</select></label><label>Mesures (numéros)<input id="as-mesures" placeholder="46, 47"></label><label>Lecture<select id="as-statut"><option value="lu">lue</option><option value="resume">résumé seulement</option><option value="a-verifier">à vérifier</option></select></label><label>Ce que montre la source<textarea id="as-montre" rows="3"></textarea></label><label>Chiffre à citer<textarea id="as-chiffre" rows="2"></textarea></label><label>Limites<textarea id="as-limites" rows="2"></textarea></label><label>Ailleurs (exemple étranger)<textarea id="as-ailleurs" rows="2"></textarea></label></div><p class="filters"><button class="chip" id="as-go">Ajouter</button></p><p class="mut" id="as-msg" role="status"></p></section>';
      var render = function () {
        var xs = SI.filter(function (x) { return x.categorie === st.c && (!st.th || x.theme === st.th) && (!st.q || norm([x.titre, x.auteurs, x.resume, x.annee].join(" ")).indexOf(st.q) >= 0); });
        $$("#so-c .chip").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-c") === st.c); }); $$("#so-t .chip").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-t") === st.th); });
        $("#so-out").innerHTML = '<p class="kick">' + plural(xs.length, "fiche") + "</p>" + xs.slice(0, N).map(function (x) { var t = TH.filter(function (y) { return y.id === x.theme; })[0]; return '<div class="entree"><span class="kick">' + esc([t && t.court, x.type === "a-classer" ? "à classer" : x.type, x.annee, { lu: "lue", resume: "résumé lu", "a-verifier": "à vérifier" }[x.statut]].filter(Boolean).join(" · ")) + "</span><b>" + (/^https?:\/\//.test(x.url || "") ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' + esc(x.titre) + "</a>" : esc(x.titre)) + "</b>" + (x.auteurs ? "<i>" + esc(Array.isArray(x.auteurs) ? x.auteurs.join(", ") : x.auteurs) + "</i>" : "") + (x.resume ? "<span>" + inline(x.resume) + "</span>" : "") + (x.mesures && x.mesures.length ? '<span class="mut">' + numLk(x.mesures) + "</span>" : "") + "</div>"; }).join("") + (xs.length > N ? '<p><button class="chip" id="so-plus">Afficher la suite</button></p>' : "");
        var pl = $("#so-plus"); if (pl) pl.addEventListener("click", function () { N += 120; render(); });
      };
      box.addEventListener("click", function (ev) { var c = ev.target.closest("[data-c]"), t = ev.target.closest("[data-t]"); if (c) { st.c = c.getAttribute("data-c"); N = 60; render(); } else if (t) { st.th = t.getAttribute("data-t"); N = 60; render(); } });
      $("#so-q").addEventListener("input", function () { st.q = norm(this.value.trim()); N = 60; render(); });
      $("#as-go").addEventListener("click", function () {
        var g = function (k) { return $("#as-" + k).value.trim(); }, msg = function (s) { $("#as-msg").textContent = s; };
        if (!g("titre") || !g("url") || !g("montre")) { msg("Titre, lien et résumé sont nécessaires."); return; }
        envoi("source", g("titre"), "Source proposée : " + g("titre"), { titre: g("titre"), auteurs: g("auteurs"), annee: g("annee"), nature: g("type"), url: g("url"), theme: g("theme"), mesures: (g("mesures").match(/\d+/g) || []).map(Number), statut: g("statut"), ce_que_montre: g("montre"), chiffre: g("chiffre"), limites: g("limites"), ailleurs: g("ailleurs") }, msg);
      });
      render();
    })();

    // ---------- contribuer
    (function () {
      var g = C.guide || {};
      el("contribuer").innerHTML = '<div class="thead"><h1>Contribuer</h1></div>' + connexion() + '<div class="lire">' + rich(String(g.contribuer || "Guide à venir.").replace(/^# .*\n/, ""), 0) + "</div>" + (g.skills && g.skills.length ? '<h2 class="h2">Les agents de recherche à réutiliser</h2><p class="mut">Dans le dossier .claude/skills du dépôt. Claude Code les charge seul ; Codex les lit par AGENTS.md.</p>' + g.skills.map(function (s) { return '<div class="entree"><b>' + esc(s.nom) + "</b><span>" + esc(s.description) + '</span><span class="kick">' + esc(s.chemin) + "</span></div>"; }).join("") : "") + (g.agents ? '<details class="in"><summary>Consignes données aux agents (AGENTS.md)</summary><div class="lire">' + rich(g.agents, 1) + "</div></details>" : "");
    })();
  });
})();
