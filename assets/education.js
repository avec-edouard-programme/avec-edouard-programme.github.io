// Site éducation fusionné dans le site des programmes. Données : C.education (build/education.py). Aucun style en ligne, aucune bibliothèque.
// Contrat : PA.edu.{sujets, renderTheme, renderPropositions, renderInternational, renderBoussole, renderTester, index}
// PA.edu.onNavigate(sujet, section, carte) : à définir par l'application pour suivre les liens d'un thème à l'autre.
(function () {
  "use strict";
  var PA = window.PA = window.PA || { mods: [] };
  var SITE = "https://politiques-educatives.github.io";
  var IMPL = { soutient: "Va dans notre sens", condition: "À une condition", nuance: "Nuance", contredit: "Contredit" };
  var ELAB = { "convergent": "Convergent", "à compléter": "À compléter", "tension": "Tension", "hors champ": "Hors champ" };
  var TAG2THEME = { formation: "ecole", inegalites: "ecole", inclusion: "handicap", ecrans: "handicap", orientation: "orientation", emploi: "orientation" };
  var M = null; // modèle construit une fois

  function model(ctx) {
    if (M && M.E === ctx.C.education) return M;
    var E = ctx.C.education; if (!E) return null;
    var by = function (l, k) { var o = {}; (l || []).forEach(function (x) { o[String(x[k])] = x; }); return o; };
    M = { E: E, p: by(E.propositions, "id"), s: by(E.sources, "id"), g: by(E.graphiques, "id"), d: by(E.dossiers, "slug"), l: by(E.livret, "n"),
      a: by(E.livret_ajouts, "id"), n: by(E.notes, "fichier"), pol: by(E.politiques, "pdf"), gen: by(E.notes_generees, "dossier"), suj: by(E.sujets, "id"),
      f: by((E.ailleurs || {}).facts, "id"), map: by((E.ailleurs || {}).themes, "key"), T: by((E.sections || {}).themes, "theme"), apports: (E.sections || {}).apports || {}, liv: {} };
    (E.livret || []).forEach(function (m) { (m.cartes || []).forEach(function (c) { (M.liv[c] = M.liv[c] || []).push(m); }); });
    var U = { p: {}, s: {}, g: {}, d: {}, n: {}, l: {}, gen: {} };
    (E.sections.themes || []).forEach(function (T) {
      (T.sections || []).concat([T.reste || {}]).forEach(function (q) {
        (q.propositions || []).forEach(function (k) { U.p[k] = 1; }); (q.sources || []).forEach(function (k) { U.s[k] = 1; });
        (q.ailleurs_sources || []).forEach(function (a) { U.s[a.id] = 1; });
        if (q.chiffre && q.chiffre.graphique) U.g[q.chiffre.graphique] = 1; (q.graphiques_plus || []).forEach(function (k) { U.g[k] = 1; });
        (q.dossiers || []).forEach(function (k) { U.d[k] = 1; }); (q.notes || []).forEach(function (k) { U.n[k] = 1; });
        (q.livret || []).forEach(function (k) { U.l[String(k)] = 1; }); (q.notes_generees || []).forEach(function (k) { U.gen[k] = 1; });
      });
    });
    var trans = (E.sections.transversal || {}).dossiers || []; trans.forEach(function (k) { U.d[k] = 1; });
    var ids = function (l, o) { return (l || []).filter(function (k) { return o[k]; }).map(function (k) { return o[k]; }); };
    var themeOf = function (tags) { for (var i = 0; i < (tags || []).length; i++) { if (TAG2THEME[tags[i]]) return TAG2THEME[tags[i]]; if (M.suj[tags[i]]) return tags[i]; } return null; };
    M.ids = ids; M.themeOf = themeOf;
    M.reste = function (tid) { // rattachements non placés : « Tout le reste du thème »
      var T = M.T[tid] || {}, R = T.reste || {}, mine = function (t) { return themeOf(t) === tid; };
      return { blocs: R.blocs, sources: R.sources, voiepro_plus: R.voiepro_plus, notes: R.notes, graphiques_plus: R.graphiques_plus, dossiers: R.dossiers,
        _props: ids(R.propositions, M.p).concat((E.propositions || []).filter(function (p) { return !U.p[p.id] && mine(p.sujets); })),
        _src: E.sources.filter(function (s) { return !U.s[s.id] && mine(s.sujets); }),
        _gr: E.graphiques.filter(function (g) { return !U.g[g.id] && mine([g.sujet]); }),
        _dos: E.dossiers.filter(function (d) { return !U.d[d.slug] && (mine(d.sujets) || (!(d.sujets || []).length && tid === "voiepro")); }).concat(ids(trans, M.d)),
        _notes: E.notes.filter(function (n) { return !U.n[n.fichier] && mine(n.sujets); }), _pol: E.politiques.filter(function (n) { return !U.n[n.pdf] && mine(n.sujets); }),
        _gen: E.notes_generees.filter(function (n) { return !U.gen[n.dossier] && mine(n.sujets || [n.sujet]); }),
        _liv: ids(R.livret, M.l).concat(E.livret.filter(function (m) { return !U.l[String(m.n)] && mine(m.sujets); })) };
    };
    M.propTheme = {};
    E.sections.themes.forEach(function (T) { (T.sections || []).concat([Object.assign({ id: "reste" }, T.reste)]).forEach(function (q) { (q.propositions || []).forEach(function (k) { M.propTheme[k] = [T.theme, q.id]; }); }); });
    E.propositions.forEach(function (p) { if (!M.propTheme[p.id]) M.propTheme[p.id] = [themeOf(p.sujets) || "orientation", "reste"]; });
    return M;
  }

  function R(ctx) { // rendu
    var m = model(ctx), E = m.E, esc = ctx.esc;
    var md = function (s) { return ctx.inline(s == null ? "" : s); };
    var slug = function (s) { return ctx.norm(s || "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); };
    var b = function (lab, cls) { return lab ? '<span class="badge ed-b ' + (cls || "") + '">' + esc(lab) + "</span>" : ""; };
    var ext = function (u, t) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + t + "</a>"; };
    var url = function (u) { return /^https?:/.test(u || "") ? u : SITE + (String(u).charAt(0) === "/" ? "" : "/") + u; };
    var pdf = function (f) { return SITE + "/assets/notes/" + f; };
    var fr = function (v) { return Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 1 }); };
    var N = function (n) { return /^\d+$/.test(String(n)) && ctx.byNum && ctx.byNum[+n]; };
    var nlink = function (n, t) { return N(n) ? '<a href="#" data-n="' + esc(n) + '">' + t + "</a>" : t; };
    var row = function (head, body, attrs, cls) { return '<details class="mes ed-row ' + (cls || "") + '"' + (attrs || "") + '><summary><div class="mt">' + head + '</div></summary><div class="mb">' + body + "</div></details>"; };
    var inn = function (sum, body, attrs) { return body ? '<details class="in"' + (attrs || "") + "><summary>" + sum + "</summary>" + body + "</details>" : ""; };
    var ul = function (l) { return (l || []).length ? '<ul class="ed-ul">' + l.map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</ul>" : ""; };
    var blk = function (t, h, cls) { return h ? '<div class="ed-blk ' + (cls || "") + '"><h3 class="ed-h3">' + t + "</h3>" + h + "</div>" : ""; };
    var cardLinks = function (l) { return (l || []).filter(function (c) { return m.p[c]; }).map(function (c) { return '<a href="#" data-edcard="' + esc(c) + '">' + md(m.p[c].titre) + "</a>"; }).join(" · "); };
    var lien = function (u) { return u ? " " + ext(u, "Lien") : ""; };

    function cas(c, id) {
      if (!c) return "";
      var h = '<div class="box ed-cas" data-ed-cas="' + esc(id) + '"><h4>Ailleurs : le cas le plus proche</h4>';
      if (c.aucun_exemple && !c.pays) return h + "<p>" + md(c.aucun_exemple) + "</p></div>";
      var s = c.source || {};
      return h + "<p><b>" + esc(c.pays) + "</b> : " + md(c.politique) + " " + b(IMPL[c.implication] || c.implication, "ed-im-" + slug(c.implication)) + " " + (c.type_preuve ? b("Preuve " + c.type_preuve) + " " : "") + b(c.confiance ? "Confiance " + c.confiance : "", "ed-cf-" + slug(c.confiance)) + "</p>" +
        "<p>" + md(c.explication) + "</p><p><b>Le chiffre :</b> " + md(c.chiffre) + (c.comparaison ? " ; comparé à : " + md(c.comparaison) : "") + "</p>" +
        (c.citation ? "<blockquote>« " + esc(c.citation) + " »</blockquote>" : "") +
        '<p class="mut">Source : ' + (s.url ? ext(s.url, esc(s.ref || s.url)) : esc(s.ref || "")) + (s.page ? ", " + esc(s.page) : "") + (c.lu === "résumé" ? " (seul le résumé a été lu)" : "") + "</p></div>";
    }
    function prop(p) {
      var liv = (m.liv[p.id] || []).map(function (x) { return nlink(x.n, "N°" + esc(x.n) + " (" + esc(ELAB[x.eval] || x.eval) + ")"); }).join(" · ");
      return row(md(p.titre) + ' <span class="ed-meta">' + b(p.statut, "ed-st-" + slug(p.statut)) + "</span>",
        '<p class="mut">' + esc([p.theme, p.issue_de ? "Issue de : " + p.issue_de : ""].filter(Boolean).join(" · ")) + "</p><p>" + md(p.explication) + "</p>" +
        (liv ? "<p><b>Livret :</b> " + liv + "</p>" : "") +
        inn("Ce que disent les preuves (" + (p.preuves || []).length + ")", ul(p.preuves)) + cas(E.cas[p.id], p.id) +
        (p.note ? '<p class="mut">' + ext(pdf(p.note), "Lire la note (PDF)") + "</p>" : ""), ' data-ed-p="' + esc(p.id) + '"');
    }
    function livret(x) {
      var l = cardLinks(x.cartes);
      return row(nlink(x.n, "N°" + esc(x.n)) + " " + md(x.titre) + ' <span class="ed-meta">' + b(ELAB[x.eval] || x.eval, "ed-e-" + slug(x.eval)) + "</span>",
        "<p>" + md(x.resume) + ' <span class="mut">(livret, p. ' + esc(x.page) + ")</span></p><p><b>Notre évaluation :</b> " + md(x.apport) + "</p>" + (l ? '<p class="mut">Voir : ' + l + "</p>" : ""), ' data-ed-l="' + esc(x.n) + '"');
    }
    function source(s) {
      var pr = cardLinks(s.propositions);
      return row('<span class="ed-kind">' + esc(s.type) + "</span> " + md(s.titre) + ' <span class="ed-meta">' + b(s.statut, "ed-v-" + slug(s.statut)) + '</span><span class="ed-one">' + md(s.cle) + "</span>",
        '<p class="mut">' + md(s.ref) + lien(s.lien) + "</p><p>" + md(s.resume) + "</p>" + inn("Partie par partie", ul(s.sections)) +
        '<p><b>À citer :</b> ' + md(s.cle) + ' <button type="button" class="chip" data-edcopy="' + esc(s.id) + '">Copier</button></p>' +
        (pr ? '<p class="mut">Soutient : ' + pr + "</p>" : "") + (s.dossier && m.d[s.dossier] ? dossier(m.d[s.dossier], true) : ""), ' data-ed-s="' + esc(s.id) + '"', "ed-src");
    }
    function dossier(d, bref) { // texte chargé à l'ouverture seulement
      return '<details class="in ed-dos" data-ed-d="' + esc(d.slug) + '"><summary>' + (bref ? "Dossier de recherche : " : "") + md(m.apports[d.slug] || d.titre) + ' <span class="mut">(' + esc(d.mots) + ' mots)</span></summary><div class="ed-doc"></div></details>';
    }
    var noteLi = function (n) { return '<li data-ed-n="' + esc(n.fichier) + '">' + ext(pdf(n.fichier), esc(n.titre)) + ' <span class="mut">' + esc(n.date) + (n.pages ? " · " + esc(n.pages) + " p." : "") + " · PDF</span>" + (n.resume ? '<p class="mut">' + md(n.resume) + "</p>" : "") + "</li>"; };
    var polLi = function (n) { return '<li data-ed-n="' + esc(n.pdf) + '">' + ext(pdf(n.pdf), esc(n.titre)) + ' <span class="mut">' + esc(n.date) + ' · 1 p. · PDF · </span><a href="#" data-ednav="international">lire la fiche</a></li>'; };
    var genLi = function (n) { var d = n.dossier; return '<li data-ed-n="' + esc(d) + '">' + (n.pdf || d ? ext(url(n.pdf || d + "/note.pdf"), esc(n.titre)) : esc(n.titre)) + ' <span class="mut">' + esc(n.date) + (d ? " · " + ext(url(n.docx || d + "/note.docx"), "Word") : "") + " · brouillon généré, non relu</span></li>"; };

    // ---------- graphiques SVG
    var chartN = 0;
    function wrap(t, n) { var o = [""], w = String(t).split(" "); w.forEach(function (x) { if ((o[o.length - 1] + " " + x).trim().length > n) o.push(x); else o[o.length - 1] = (o[o.length - 1] + " " + x).trim(); }); return o; }
    function svgBars(g, cats, sers) {
      var W = 620, y = 4, out = "", vals = g.donnees.map(function (r) { return +r.valeur; }), mx = Math.max.apply(null, vals.concat([0])), mn = Math.min.apply(null, vals.concat([0]));
      var x0 = 4, span = W - 92, sc = span / ((mx - mn) || 1), z = x0 + (0 - mn) * sc;
      cats.forEach(function (c) {
        wrap(c, 76).forEach(function (l) { out += '<text class="ed-tx" x="' + x0 + '" y="' + (y + 15) + '">' + esc(l) + "</text>"; y += 19; });
        sers.forEach(function (s, i) {
          var r = g.donnees.filter(function (q) { return q.categorie === c && q.serie === s; })[0]; if (!r) return;
          var v = +r.valeur, w = Math.max(1, Math.abs(v) * sc), x = v >= 0 ? z : z - w;
          out += '<rect class="ed-s' + (i % 4) + '" x="' + x.toFixed(1) + '" y="' + (y + 2) + '" width="' + w.toFixed(1) + '" height="15" rx="2"><title>' + esc(c + ", " + s + " : " + fr(v) + (r.salaire ? " (salaire net médian " + fr(r.salaire) + " €)" : "")) + "</title></rect>" +
            '<text class="ed-tv" x="' + ((v >= 0 ? x + w : z) + 6).toFixed(1) + '" y="' + (y + 14.5) + '">' + fr(v) + (r.salaire ? " · " + fr(r.salaire) + " €" : "") + "</text>"; y += 20;
        });
        y += 8;
      });
      return { w: W + (g.donnees.some(function (r) { return r.salaire; }) ? 60 : 0), h: y, body: out };
    }
    function svgLine(g, cats, sers) {
      var W = 620, H = 270, L = 46, Rr = 24, T = 20, B = 34, vals = g.donnees.map(function (r) { return +r.valeur; }), mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals), pad = (mx - mn) * 0.14 || 1;
      mx += pad; mn -= pad; var X = function (i) { return L + (cats.length < 2 ? 0 : i * (W - L - Rr) / (cats.length - 1)); }, Y = function (v) { return T + (mx - v) * (H - T - B) / (mx - mn); }, out = "";
      for (var k = 0; k < 5; k++) { var v = mn + (mx - mn) * k / 4; out += '<line class="ed-gr" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/><text class="ed-ta" text-anchor="end" x="' + (L - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '">' + fr(v) + "</text>"; }
      var step = Math.ceil(cats.length / 9);
      cats.forEach(function (c, i) { if (i % step && i !== cats.length - 1) return; if (i === cats.length - 1 && i % step && i % step < step / 2) return; out += '<text class="ed-ta" text-anchor="middle" x="' + X(i).toFixed(1) + '" y="' + (H - 10) + '">' + esc(c) + "</text>"; });
      sers.forEach(function (s, i) {
        var pts = []; cats.forEach(function (c, j) { var r = g.donnees.filter(function (q) { return q.categorie === c && q.serie === s; })[0]; if (r) pts.push([X(j), Y(+r.valeur), +r.valeur, c]); });
        out += '<polyline class="ed-ln ed-l' + (i % 4) + '" fill="none" points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '"/>';
        pts.forEach(function (p, j) { var lab = g.etiquettes === false ? (j === 0 || j === pts.length - 1) : pts.length <= 10; out += '<circle class="ed-s' + (i % 4) + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4"><title>' + esc(s + ", " + p[3] + " : " + fr(p[2])) + "</title></circle>" + (lab ? '<text class="ed-tv" text-anchor="middle" x="' + p[0].toFixed(1) + '" y="' + (p[1] - 9).toFixed(1) + '">' + fr(p[2]) + "</text>" : ""); });
      });
      return { w: W, h: H, body: out };
    }
    function chart(g) {
      var csv = SITE + "/assets/charts/data/" + g.id + ".csv", inner = "", meta = E.charts_meta;
      if (g.type === "carte") {
        inner = g.par_classe ? '<table class="heat"><thead><tr><th>Classe</th><th>Nombre</th><th>Lieux</th></tr></thead><tbody>' + g.par_classe.map(function (c) { return "<tr><td>" + esc(c.classe) + "</td><td>" + c.n + "</td><td>" + esc(c.lieux.join(", ") || "voir la carte") + "</td></tr>"; }).join("") + "</tbody></table>" :
          '<table class="heat"><thead><tr><th>Valeurs les plus hautes</th><th>Valeurs les plus basses</th></tr></thead><tbody><tr>' + [g.plus_haut, g.plus_bas].map(function (l) { return "<td>" + (l || []).map(function (x) { return esc(x[0]) + " : <b>" + fr(x[1]) + "</b>"; }).join("<br>") + "</td>"; }).join("") + "</tr></tbody></table>";
        var th = null; E.sections.themes.forEach(function (T) { (T.sections || []).forEach(function (q) { if ((q.chiffre && q.chiffre.graphique === g.id) || (q.graphiques_plus || []).indexOf(g.id) >= 0) th = T.theme + "/" + q.id; }); });
        inner = '<div class="hwrap">' + inner + "</div><p>" + ext(SITE + "/#" + (th || m.themeOf([g.sujet]) || ""), "Voir la carte (" + g.n + " " + (g.geo ? "zones d'emploi" : "départements") + ")") + "</p>";
      } else if (g.donnees && g.donnees.length) {
        var cats = [], sers = []; g.donnees.forEach(function (r) { if (cats.indexOf(r.categorie) < 0) cats.push(r.categorie); if (sers.indexOf(r.serie) < 0) sers.push(r.serie); });
        var s = g.type === "ligne" ? svgLine(g, cats, sers) : svgBars(g, cats, sers), id = "edc" + (++chartN) + "-" + g.id;
        var desc = g.donnees.slice(0, 40).map(function (r) { return r.categorie + ", " + r.serie + " : " + fr(r.valeur); }).join(" ; ");
        inner = (sers.length > 1 ? '<ul class="ed-leg">' + sers.map(function (x, i) { return '<li><svg width="12" height="12" aria-hidden="true"><rect class="ed-s' + (i % 4) + '" width="12" height="12" rx="2"/></svg> ' + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
          '<svg class="ed-svg" viewBox="0 0 ' + s.w + " " + s.h + '" role="img" aria-labelledby="' + id + "-t " + id + '-d"><title id="' + id + '-t">' + esc(g.titre) + '</title><desc id="' + id + '-d">' + esc(g.unite + ". " + desc) + "</desc>" + s.body + "</svg>" + (sers.length === 1 && sers[0] ? '<p class="mut">' + esc(sers[0]) + "</p>" : "");
      }
      return '<figure class="ed-fig" data-ed-g="' + esc(g.id) + '"><figcaption>' + esc(g.titre) + "</figcaption>" + inner + '<p class="mut">' + esc(g.unite) + ". " + (g.note ? esc(g.note) + " " : "") + "Source : " + esc(g.source) + (g.auto && meta ? " (promotion " + esc(meta.insersup_promo) + ", " + esc(meta.insersup_version) + ")" : "") + ". " + ext(csv, "Données (CSV)") + "</p></figure>";
    }

    // ---------- voie pro
    var VP = E.voie_pro, vsrc = function () { return '<p class="mut">Source : ' + esc(VP.source) + "</p>"; };
    function table(t, cols) { cols = cols || t.entetes.map(function (_, i) { return i; }); return '<div class="hwrap"><table class="heat"><thead><tr>' + cols.map(function (i) { return "<th>" + esc(t.entetes[i]) + "</th>"; }).join("") + "</tr></thead><tbody>" + t.lignes.map(function (r) { return "<tr>" + cols.map(function (i) { return "<td>" + md(r[i]) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>"; }
    var P = function (t) { return "<p>" + md(t) + "</p>"; }, H4 = function (t) { return '<h4 class="ed-h4">' + t + "</h4>"; };
    var VPB = {
      portefeuille: function () { return blk("Choisir comme on compose un portefeuille", P(VP.portefeuille) + vsrc()); },
      indice: function () { return blk("L'indice de risque des filières techniques (version 1)", '<p class="mut">Une mesure du GT : le risque d\'une spécialité, pas seulement son exposition à l\'IA. Risque et rangs de 0 à 1 (1 = plus de risque).</p>' + inn("Les 10 spécialités les moins risquées", table(VP.faibles, [0, 1, 2, 3, 4, 5]) + P(VP.apres_faibles)) + inn("Les 10 spécialités les plus risquées", table(VP.forts, [0, 1, 2, 3, 4, 5]) + P(VP.apres_forts)) + vsrc()); },
      resultats: function () { return blk("Les résultats de la version 1", ul(VP.resultats) + vsrc()); },
      methode: function () { return blk("Méthode de l'indice", P(VP.demande_v1) + table(VP.composantes) + P(VP.echelle) + P(VP.poids) + H4("Les cinq scénarios (vue portefeuille)") + table(VP.scenarios) + H4("Les 10 extrêmes, composante par composante") + table(VP.faibles) + table(VP.forts) + vsrc()); },
      batiment: function () { return blk("Le bâtiment, revérifié", ul(VP.batiment) + table(VP.batiment_table) + '<p class="mut">' + esc(VP.batiment_note) + "</p>" + P(VP.lecture_tension) + vsrc()); },
      limites: function () { return blk("Limites de l'indice", ul(VP.limites)); },
      chine: function () { return blk("La concurrence chinoise dans la Boussole", P(VP.chine)); },
      donnees: function () { return blk("Les données de l'indice", '<ul class="ed-ul">' + VP.donnees.map(function (d) { return "<li>" + ext(d[1], esc(d[0])) + "</li>"; }).join("") + "</ul>"); },
      carte: function () { return '<div class="box"><p>' + md(VP.carte) + '</p><p class="mut">Sources : ' + esc(VP.carte_source) + "</p><p>" + ext(SITE + "/boussole/#carte", "Ouvrir la carte des lycées pro") + "</p></div>"; }
    };
    // ---------- blocs fixes
    function spark(s) {
      if (!s || s.length < 2) return ""; var v = s.map(function (x) { return x.v; }), mn = Math.min.apply(null, v), mx = Math.max.apply(null, v);
      return '<svg class="ed-spark" viewBox="0 0 200 40" role="img" aria-label="' + esc("De " + s[0].t + " (" + fr(s[0].v) + ") à " + s[s.length - 1].t + " (" + fr(s[s.length - 1].v) + ")") + '"><polyline class="ed-ln ed-l0" fill="none" points="' + v.map(function (x, i) { return (i * 200 / (v.length - 1)).toFixed(1) + "," + (36 - (mx === mn ? 0 : (x - mn) * 32 / (mx - mn))).toFixed(1); }).join(" ") + '"/></svg><p class="mut">' + esc(s[0].t) + " → " + esc(s[s.length - 1].t) + "</p>";
    }
    var BLOCS = {
      suivi: function () {
        var S = E.suivi || {}, c = S.chomage, l = S.lift, t = "";
        if (c) t += '<div class="box"><p class="ed-big">' + fr(c.jeunes) + " % <span>au " + esc(c.periode) + "</span></p><p>Chômage des moins de 25 ans (ensemble : " + fr(c.ensemble) + " %), contre " + fr(c.jeunes_an_avant) + " % un an plus tôt</p>" + spark(c.serie) + '<p class="mut">' + ext(c.url, "Insee") + ", chômage au sens du BIT, données CVS</p></div>";
        if (l) t += '<div class="box"><p class="ed-big">' + fr(l.ia_generative) + " <span>offres au " + esc(l.trimestre) + "</span></p><p>Offres d'emploi demandant des compétences en IA générative" + (l.ia_generative_an_avant ? ", contre " + fr(l.ia_generative_an_avant) + " un an plus tôt" : "") + " ; " + fr(l.part_generative) + " % des " + fr(l.ia_toutes) + " offres en IA du trimestre</p>" + spark(l.serie) + '<p class="mut">' + ext(l.url, "LIFT, HEC Paris") + ", base JOCAS de la Dares ; la série s'arrête en " + esc(l.fin) + "</p></div>";
        t += '<div class="box"><p class="ed-big">−28 % <span>contre −7,5 %</span></p><p>Embauches en CDI des 21-29 ans, novembre 2022 à mars 2026, dans le cinquième des métiers les plus exposés à l\'IA, contre le cinquième le moins exposé</p><p class="mut">Palladino, Bergeaud, Bertheau, Bunel et Degos (2026), Banque de France et LIFT. Étude, non actualisée ; la cause n\'est pas établie.</p></div>';
        return blk("Suivi : l'IA et l'emploi des jeunes", '<div class="ed-tiles">' + t + '</div><p class="mut">Chiffres lus dans les séries publiques le ' + esc(S.lu_le ? S.lu_le.split("-").reverse().join("/") : "") + ". Le chômage couvre tout le marché du travail et n'isole pas l'effet de l'IA ; les offres en IA mesurent la demande de spécialistes, pas l'effet de l'IA sur les autres emplois.</p>");
      },
      note_ia: function () {
        var N = E.note_ia; if (!N) return ""; var r = function (c) { return inn("<b>" + md(c.titre) + "</b>", P(c.texte)); };
        return blk("La note IA et jeunes", '<p class="mut">Texte de la note « ' + esc(N.titre) + " » (GT Éducation, novembre 2026), repris sans changement.</p>" + P(N.intro) + H4("Les recommandations") + N.conditions.map(r).join("") + H4("Éléments de langage") + '<ol class="ed-ul">' + N.messages.map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</ol><p><b>Argumentaire.</b> " + md(N.argumentaire) + "</p>" + H4("Le constat") + "<p><b>Pourquoi maintenant.</b> " + md(N.pourquoi) + "</p>" + N.constat.map(r).join(""));
      },
      masters: function () { return blk("Masters", "<p>Le master sert souvent de filtre plus que de compétence : il trie par origine sociale, retarde de deux ans l'entrée dans la vie active, et une licence professionnelle insère mieux. La " + ext(SITE + "/boussole/", "Boussole") + " affiche l'emploi et le salaire de chaque master (étape « Master ou emploi »).</p>"); },
      comms: function () {
        return blk("Comms : cinq vidéos britanniques", (E.videos || []).map(function (v) { return inn(esc(v.titre) + " : " + md(v.lecon), P(v.resume) + '<p class="mut">' + esc(v.meta || "") + " · " + ext(v.url, "Voir la vidéo") + "</p>"); }).join("")) +
          blk("Comms : ce qui marche", table({ entetes: ["Ressort", "Pour nous"], lignes: [["Un problème du quotidien, pas un thème", "le choix d'études, le premier CDI, l'attente d'un psy"], ["Un chiffre comparatif en une phrase", "un master sur dix sous 49 % d'emploi, un sur dix au-dessus de 86 %"], ["Une voix jeune qui retourne un cliché", "« les jeunes ne veulent plus travailler »"], ["Sous-titres incrustés, mot à mot", "vidéos vues sans le son"]] })) +
          blk("Comms : un post alarmé sur les évaluations nationales, vérifié", ul(["**Confirmé.** Seconde générale et technologique : 28,1 % dans les groupes faibles en maths, contre 19,2 % en 2019 ; dictée de CE1 en baisse de 2,5 points sur un an (DEPP).", "**Forcé.** « Les performances diminuent du CE1 au CM2 » : en CM2, le français est stable pour 7 compétences sur 9.", "**Non vérifiable.** Les exemples de questions : la DEPP ne publie aucun résultat question par question."]) + '<p class="mut">' + ext("https://x.com/JLeFlochImad/status/2122979063086137629", "Post X du 18 novembre 2026") + "</p>");
      }
    };
    function milburn() {
      var C = E.milburn_critiques;
      return '<p class="mut">981 000 jeunes de 16 à 24 ans sans emploi ni formation au Royaume-Uni, soit 13,0 % (ONS, avril-juin 2026). Rapport publié le 17 novembre 2026.</p>' + (E.milburn || []).map(function (x) { return row(esc(x.n) + ". " + md(x.titre) + ' <span class="ed-meta">' + b(x.statut, "ed-m-" + slug(x.statut)) + "</span>", (x.chiffre ? "<p><b>Chiffre :</b> " + md(x.chiffre) + "</p>" : "") + (x.france ? "<p><b>En France :</b> " + md(x.france) + "</p>" : "") + '<p class="mut">Rapport Milburn, p. ' + esc(x.pages) + "</p>", ' data-ed-m="' + esc(x.n) + '"'); }).join("") +
        row("Ce que la France a déjà, et ce qui lui manque", "<p>La France a déjà une garantie avec allocation (le contrat d'engagement jeune), une obligation de formation jusqu'à 18 ans et les missions locales. Il lui manque ce que Milburn propose : un emploi payé garanti en dernier recours ; une mesure du devenir des élèves par établissement et une norme « prêt pour le travail », inspectées ; un suivi des postes de débutants face à l'IA ; des outils de repérage précoce du décrochage.</p><p>Le Royaume-Uni mesure les 16-24 ans (13,0 %), la France les 15-29 ans (13,3 %, Insee). Sur les 15-24 ans, le Royaume-Uni (13,6 %, OCDE 2025) est au-dessus de la France (10,5 % en 2023).</p>") +
        (C ? row(esc(C.titre), C.paragraphes.map(P).join("") + '<p class="mut">' + md(C.source || "") + "</p>") : "");
    }
    // ---------- sections
    var getp = function (o, p) { return String(p).split(".").reduce(function (x, k) { return x == null ? x : x[k]; }, o); };
    function resolve(x) {
      if (typeof x === "string") return x; if (!x) return "";
      if (x.source) return m.s[x.source] ? m.s[x.source].cle : "";
      if (x.vp) return getp(VP, x.vp) || "";
      if (x.note_ia) { var c = getp(E.note_ia, x.note_ia); return c ? "**" + c.titre + ".** " + c.texte.charAt(0).toUpperCase() + c.texte.slice(1) : ""; }
      if (x.graphique) return m.g[x.graphique] ? m.g[x.graphique].note : "";
      return "";
    }
    function chiffre(c) {
      if (!c) return ""; if (c.graphique && m.g[c.graphique]) return chart(m.g[c.graphique]);
      if (c.source && m.s[c.source]) { var s = m.s[c.source]; return '<div class="ed-key"><p class="ed-kf">' + md(s.cle) + '</p><p class="mut">' + md(s.ref) + lien(s.lien) + "</p></div>"; }
      if (c.vp === "carte") return VPB.carte();
      if (c.vp) return '<div class="ed-key"><p class="ed-kf">' + md(getp(VP, c.vp) || "") + "</p>" + vsrc() + "</div>";
      return "";
    }
    function plus(q, label) {
      var h = "", n = [], add = function (t, l, k, html) { if (l) { n.push(ctx.plural(l, k)); h += blk(t, html); } };
      var nt = (q.notes || []).map(function (f) { return m.n[f] ? noteLi(m.n[f]) : m.pol[f] ? polLi(m.pol[f]) : ""; }).concat(m.ids(q.notes_generees, m.gen).map(genLi), (q._notes || []).map(noteLi), (q._pol || []).map(polLi), (q._gen || []).map(genLi)).filter(Boolean);
      add("Les notes du GT", nt.length, "note", '<ul class="ed-ul">' + nt.join("") + "</ul>");
      var dos = m.ids(q.dossiers, m.d).concat(q._dos || []); add("Les dossiers de recherche", dos.length, "dossier", dos.map(function (d) { return dossier(d); }).join(""));
      var gr = m.ids(q.graphiques_plus, m.g).concat(q._gr || []); add("Autres graphiques", gr.length, "graphique", gr.map(chart).join(""));
      var sr = m.ids(q.sources, m.s).concat(m.ids((q.ailleurs_sources || []).map(function (a) { return a.id; }).filter(function (k) { return (q.sources || []).indexOf(k) < 0; }), m.s), q._src || []); add("Les sources", sr.length, "source", sr.map(source).join(""));
      (q.blocs || []).forEach(function (k) { if (BLOCS[k]) h += BLOCS[k](); });
      (q.voiepro_plus || []).forEach(function (k) { if (VPB[k]) h += VPB[k](); });
      add("Autres propositions", (q._props || []).length, "proposition", (q._props || []).map(prop).join(""));
      add("Le programme (livret)", (q._liv || []).length, "mesure", (q._liv || []).map(livret).join(""));
      return h ? '<details class="ed-more"><summary>' + label + (n.length ? ' <span class="mut">' + esc(n.join(" · ")) + "</span>" : "") + "</summary>" + h + "</details>" : "";
    }
    function section(T, q) {
      var pr = m.ids(q.propositions, m.p), lv = m.ids((q.livret || []).map(String), m.l), aj = m.ids(q.ajouts, m.a), bref = (q.bref || []).map(resolve).filter(Boolean);
      return '<section class="ed-sec" id="ed-' + T + "-" + esc(q.id) + '" data-ed-q="' + T + "/" + esc(q.id) + '"><details class="ed-secd"' + (q === m.T[T].sections[0] ? " open" : "") + '><summary><h2 class="h2">' + md(q.titre) + "</h2></summary>" +
        (bref.length ? ul(bref) : "") + blk("Le chiffre clé", chiffre(q.chiffre)) + (q.voiepro || []).map(function (k) { return VPB[k] ? VPB[k]() : ""; }).join("") +
        blk("Ce que nous proposons", pr.map(prop).join("") + (lv.length ? inn("Dans le livret « Croire en nous » (" + lv.length + ")", lv.map(livret).join("")) : "") + (aj.length ? H4("Ce que nos travaux ajoutent au livret") + '<ul class="ed-ul">' + aj.map(function (a) { var c = cardLinks(a.cartes); return '<li data-ed-a="' + esc(a.id) + '">' + md(a.texte) + (c ? ' <span class="mut">' + c + "</span>" : "") + "</li>"; }).join("") + "</ul>" : "")) +
        ((q.edl || []).length ? blk("Éléments de langage", '<ul class="ed-ul">' + q.edl.map(function (e) { return "<li><b>" + esc(e.amorce) + ".</b> « " + esc(e.texte) + " » <span class=\"mut\">" + esc(e.source) + "</span></li>"; }).join("") + "</ul>") : "") + plus(q, "Pour aller plus loin") + "</details></section>";
    }
    var cn = function (k) { return (E.ailleurs.countries || {})[k] || k; };
    function facts(key) {
      var by = {}; E.ailleurs.facts.filter(function (f) { return f.theme === key; }).forEach(function (f) { (by[f.country] = by[f.country] || []).push(f); });
      var ks = Object.keys(by).sort(function (a, c) { return a === "FR" ? -1 : c === "FR" ? 1 : cn(a).localeCompare(cn(c), "fr"); });
      return ks.map(function (k) { return inn(esc(cn(k)) + " (" + by[k].length + ")", '<ul class="ed-ul">' + by[k].map(function (f) { return '<li data-ed-f="' + esc(f.id) + '">' + md(f.fact) + ' <span class="mut">' + (f.url ? ext(f.url, esc(f.source)) : esc(f.source)) + "</span></li>"; }).join("") + "</ul>"); }).join("");
    }
    var frame = function (src, title) { return '<details class="in ed-frame" data-ed-src="' + esc(src) + '" data-ed-title="' + esc(title) + '"><summary>' + esc(title) + "</summary><p>" + ext(src, "Ouvrir dans un nouvel onglet") + "</p></details>"; };
    var mapUrl = function (tabs, pays) { return SITE + "/comparaisons/" + (tabs.length ? "#themes=" + tabs.join(",") + "&theme=" + tabs[0] + (pays ? "&pays=" + pays : "") + "&embed=1" : ""); };
    function ailleurs(T) {
      var A = T.ailleurs || {}, tabs = (A.carte || []).filter(function (k) { return m.map[k]; }), st = [];
      (T.sections || []).forEach(function (q) { (q.ailleurs_sources || []).forEach(function (a) { var s = m.s[a.id]; if (s) st.push("<li><b>" + esc(a.pays) + "</b> : " + md(s.cle) + ' <span class="mut">(' + md(q.titre) + ")</span>" + lien(s.lien) + "</li>"); }); });
      if (!tabs.length && !st.length) return "";
      return '<section class="ed-sec" id="ed-' + T.theme + '-ailleurs" data-ed-q="' + T.theme + '/ailleurs"><details class="ed-secd"><summary><h2 class="h2">Ce que font les autres pays</h2></summary>' + (A.intro ? P(A.intro) : "") + (tabs.length ? frame(mapUrl(tabs, A.pays), "La carte interactive") : "") +
        tabs.map(function (k) { return row(esc(m.map[k].label), facts(k)); }).join("") + (st.length ? blk("Études étrangères", '<ul class="ed-ul">' + st.join("") + "</ul>") : "") + "</details></section>";
    }
    return { row: row, inn: inn, ul: ul, blk: blk, prop: prop, source: source, dossier: dossier, chart: chart, section: section, plus: plus, ailleurs: ailleurs, facts: facts, frame: frame, mapUrl: mapUrl, milburn: milburn, md: md, P: P, H4: H4, ext: ext, pdf: pdf, b: b };
  }

  // ---------- Markdown des dossiers (titres, listes, tableaux, citations)
  function mdDoc(t, inline, esc) {
    var out = [], L = String(t).split("\n"), i = 0, para = [];
    var flush = function () { if (para.length) out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; };
    var cells = function (l) { return l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map(function (c) { return inline(c.trim().replace(/\\\|/g, "|")); }); };
    while (i < L.length) {
      var l = L[i], x;
      if (/^\s*\|/.test(l) && /^\s*\|?[\s:|-]+\|?\s*$/.test(L[i + 1] || "") && /-/.test(L[i + 1])) {
        flush(); var h = cells(l), rows = []; i += 2;
        while (i < L.length && /^\s*\|/.test(L[i])) rows.push(cells(L[i++]));
        out.push('<div class="hwrap"><table class="heat"><thead><tr>' + h.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>"); continue;
      }
      if ((x = /^(#{1,6})\s+(.*)$/.exec(l))) { flush(); var n = Math.min(6, x[1].length + 2); out.push("<h" + n + ">" + inline(x[2]) + "</h" + n + ">"); i++; continue; }
      if (/^\s*(---+|\*\*\*+)\s*$/.test(l)) { flush(); out.push("<hr>"); i++; continue; }
      if (/^\s*>/.test(l)) { flush(); var q = []; while (i < L.length && /^\s*>/.test(L[i])) q.push(L[i++].replace(/^\s*>\s?/, "")); out.push("<blockquote>" + inline(q.join(" ")) + "</blockquote>"); continue; }
      if (/^\s*([-*+]|\d+[.)])\s+/.test(l)) {
        flush(); var items = [];
        while (i < L.length && (/^\s*([-*+]|\d+[.)])\s+/.test(L[i]) || (/^\s{2,}\S/.test(L[i]) && items.length))) {
          var y = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(L[i]); if (y) items.push({ d: Math.floor(y[1].length / 2), o: /\d/.test(y[2]), t: y[3] }); else items[items.length - 1].t += " " + L[i].trim(); i++;
        }
        var ty = items[0].o ? "ol" : "ul", base = items[0].d, st = "<" + ty + ' class="ed-ul">', cur = "";
        var j = 0; while (j < items.length) { var it = items[j++], sub = ""; while (j < items.length && items[j].d > base) sub += "<li>" + inline(items[j++].t) + "</li>"; cur += "<li>" + inline(it.t) + (sub ? '<ul class="ed-ul">' + sub + "</ul>" : "") + "</li>"; }
        out.push(st + cur + "</" + ty + ">"); continue;
      }
      if (!l.trim()) flush(); else para.push(l.trim());
      i++;
    }
    flush(); return out.join("");
  }

  // ---------- comportements, par délégation sur l'élément rendu
  function wire(ctx, el) {
    if (el.getAttribute("data-ed-wired")) return; el.setAttribute("data-ed-wired", "1");
    el.addEventListener("toggle", function (ev) {
      var d = ev.target; if (!d.open) return; var m = model(ctx);
      var sl = d.getAttribute("data-ed-d"), box = sl && d.querySelector(".ed-doc");
      if (box && !box.firstChild && m.d[sl]) box.innerHTML = mdDoc(m.d[sl].texte, ctx.inline, ctx.esc);
      var src = d.getAttribute("data-ed-src");
      if (src && !d.querySelector("iframe")) { var f = document.createElement("iframe"); f.className = "ed-if"; f.setAttribute("title", d.getAttribute("data-ed-title")); f.setAttribute("loading", "lazy"); f.src = src; d.appendChild(f); }
    }, true);
    el.addEventListener("click", function (ev) {
      var m = model(ctx), t = ev.target.closest ? ev.target : ev.target.parentNode, c = t.closest("[data-edcard]"), n = t.closest("[data-ednav]"), k = t.closest("[data-edcopy]"), th = t.closest("[data-edsec]");
      if (th) { ev.preventDefault(); var s = el.querySelector("#" + th.getAttribute("data-edsec")); if (s) showSec(s); return; }
      if (k) { var so = m.s[k.getAttribute("data-edcopy")], tx = so.cle + "\nRéférence : " + so.ref + (so.lien ? " " + so.lien : ""); if (navigator.clipboard) navigator.clipboard.writeText(tx).then(function () { k.textContent = "Copié"; setTimeout(function () { k.textContent = "Copier"; }, 1500); }, function () { }); return; }
      if (n) { ev.preventDefault(); var p = n.getAttribute("data-ednav").split("/"); if (PA.edu.onNavigate) PA.edu.onNavigate(p[0], p[1]); return; }
      if (c) {
        ev.preventDefault(); ev.stopPropagation(); var id = c.getAttribute("data-edcard"), d = el.querySelector('[data-ed-p="' + id + '"]');
        if (!d && PA.edu.onNavigate && m.propTheme[id]) { PA.edu.onNavigate(m.propTheme[id][0], m.propTheme[id][1], id); return; }
        if (!d) { var w = document.createElement("div"); w.innerHTML = R(ctx).prop(m.p[id]); d = w.firstChild; (c.closest("p,li,div") || c).insertAdjacentElement("afterend", d); }
        PA.edu.openCard(d);
      }
    });
  }
  function showSec(s) { var d = s.querySelector("details"); if (d) d.open = true; s.scrollIntoView({ block: "start" }); }
  function put(ctx, el, html) { el.innerHTML = '<div class="ed">' + html + "</div>"; wire(ctx, el); }
  var absent = '<p class="mut">Données éducation absentes : relancer build/education.py puis build.mjs.</p>';

  PA.edu = {
    onNavigate: null,
    openCard: function (d) { if (!d) return; for (var e = d; e; e = e.parentNode) if (e.tagName === "DETAILS") e.open = true; d.scrollIntoView({ block: "start" }); d.classList.add("ed-flash"); setTimeout(function () { d.classList.remove("ed-flash"); }, 1600); },
    sujets: function (ctx) { var m = model(ctx); return m ? m.E.sujets.map(function (s) { var T = m.T[s.id] || {}; return { id: s.id, titre: s.titre, court: s.court, intro: s.intro, sections: (T.sections || []).map(function (q) { return { id: q.id, titre: q.titre }; }), n: Object.keys(m.propTheme).filter(function (k) { return m.propTheme[k][0] === s.id; }).length }; }) : []; },
    renderTheme: function (ctx, id, el, opt) {
      var m = model(ctx); if (!m) { el.innerHTML = absent; return; } var T = m.T[id], S = m.suj[id], r = R(ctx), reste = r.plus(m.reste(id), "Tout le reste du thème");
      var toc = T.sections.map(function (q) { return '<li><a href="#" data-edsec="ed-' + id + "-" + ctx.esc(q.id) + '">' + r.md(q.titre) + "</a></li>"; }).join("") + (T.ailleurs ? '<li><a href="#" data-edsec="ed-' + id + '-ailleurs">Ce que font les autres pays</a></li>' : "");
      put(ctx, el, '<div class="thead"><h1>' + ctx.esc(S.titre) + '</h1><p class="lead">' + r.md(S.intro) + '</p><ol class="ed-toc">' + toc + "</ol></div>" + T.sections.map(function (q) { return r.section(id, q); }).join("") + r.ailleurs(T) + (reste ? '<section class="ed-sec" id="ed-' + id + '-reste">' + reste + "</section>" : ""));
      if (opt && opt.section) { var s = el.querySelector("#ed-" + id + "-" + opt.section); if (s) showSec(s); }
      if (opt && opt.carte) PA.edu.openCard(el.querySelector('[data-ed-p="' + opt.carte + '"]'));
    },
    renderPropositions: function (ctx, el, id) {
      var m = model(ctx); if (!m) { el.innerHTML = absent; return; } var r = R(ctx), h = "";
      m.E.sujets.filter(function (s) { return !id || s.id === id; }).forEach(function (s) {
        var l = m.E.propositions.filter(function (p) { return m.propTheme[p.id][0] === s.id; }), g = {}, k = [];
        l.forEach(function (p) { var t = p.theme || "Autres"; if (!g[t]) { g[t] = []; k.push(t); } g[t].push(p); });
        h += '<section class="ed-sec">' + (id ? "" : '<h2 class="h2">' + ctx.esc(s.titre) + ' <span class="mut">' + ctx.plural(l.length, "proposition") + "</span></h2>") + k.map(function (t) { return r.H4(ctx.esc(t)) + g[t].map(r.prop).join(""); }).join("") + "</section>";
      });
      put(ctx, el, h);
    },
    renderInternational: function (ctx, el) {
      var m = model(ctx); if (!m) { el.innerHTML = absent; return; } var r = R(ctx), E = m.E, esc = ctx.esc;
      put(ctx, el, '<div class="thead"><h1>International</h1><p class="lead">Ce que d\'autres pays font, chiffres et sources à l\'appui : ' + E.ailleurs.facts.filter(function (f) { return f.country !== "FR"; }).length + " faits hors France.</p></div>" + r.frame(r.mapUrl([]), "La carte interactive") +
        '<h2 class="h2">Par thème</h2>' + E.ailleurs.themes.map(function (t) { return r.row(esc(t.label), r.facts(t.key)); }).join("") +
        '<h2 class="h2">Politiques d\'ailleurs</h2>' + E.politiques.map(function (n) { return '<article class="ed-sec" data-ed-pol="' + esc(n.pdf) + '"><p class="kick">' + esc(n.pays) + " · " + esc(n.date) + '</p><h3 class="ed-h3">' + esc(n.titre) + '</h3><p class="mut">' + esc(n.auteur) + "</p>" + r.ul(n.bref) + r.inn("Lire la note", (n.sections || []).map(function (s) { return r.H4(esc(s.titre)) + s.paragraphes.map(r.P).join(""); }).join("")) + (n.sources ? '<p class="mut"><b>Sources :</b> ' + r.md(n.sources) + "</p>" : "") + "<p>" + r.ext(r.pdf(n.pdf), "La note en PDF (1 page)") + "</p></article>"; }).join("") +
        '<h2 class="h2">Rapport Milburn : les 17 recommandations et la réponse britannique</h2>' + r.milburn() + r.blk("Les sources du rapport Milburn", m.ids(["milburn-2026", "kickstart-2024", "garantie-jeunes-2016", "insee-neet-2026"], m.s).map(r.source).join("")) + (m.d["12-milburn-review"] ? r.blk("Le dossier de recherche", r.dossier(m.d["12-milburn-review"])) : ""));
    },
    renderBoussole: function (ctx, el) {
      var r = model(ctx) ? R(ctx) : null; if (!r) { el.innerHTML = absent; return; }
      put(ctx, el, '<div class="thead"><h1>Boussole des formations</h1><p class="lead">De la 5e au premier emploi : les débouchés de chaque formation (Affelnet, Parcoursup, Mon Master) et ce que l\'IA sait déjà faire des premiers métiers. Prototype du GT Éducation.</p><p>' + r.ext(SITE + "/boussole/", "Ouvrir en pleine page") + " · " + r.ext(SITE + "/boussole/#carte", "La carte des lycées pro") + '</p></div><details class="in ed-frame" open data-ed-src="' + SITE + '/boussole/" data-ed-title="Boussole des formations"><summary>La Boussole</summary></details>');
      var d = el.querySelector(".ed-frame"), f = document.createElement("iframe"); f.className = "ed-if"; f.setAttribute("title", "Boussole des formations"); f.setAttribute("loading", "lazy"); f.src = SITE + "/boussole/"; if (!d.querySelector("iframe")) d.appendChild(f);
    },
    renderTester: function (ctx, el) { // ancienne page « Tester une proposition avec des personas »
      var m = model(ctx); if (!m) { el.innerHTML = absent; return; } var esc = ctx.esc, g = {}, k = [];
      m.E.personas.forEach(function (p) { if (!g[p.groupe]) { g[p.groupe] = []; k.push(p.groupe); } g[p.groupe].push(p); });
      put(ctx, el, '<p class="mut">Choisissez les rôles, collez la proposition, copiez la consigne dans l\'assistant de votre choix. Ce sont des simulations : elles ne remplacent ni un sondage ni l\'avis des personnes. Aucune donnée personnelle.</p>' + k.map(function (x) { return '<h4 class="ed-h4">' + esc(x) + "</h4>" + g[x].map(function (p) { return '<p><label><input type="checkbox" class="ed-ck" value="' + esc(p.id) + '"' + (p.id === "candidat" || p.id === "ministre" ? " checked" : "") + "> <b>" + esc(p.nom) + "</b></label></p>" + '<details class="in"><summary>Sa fiche</summary><p>' + esc(p.fiche) + "</p></details>"; }).join(""); }).join("") +
        '<p><textarea class="ed-prop" rows="8" placeholder="La mesure, pour qui, quand, combien, la preuve."></textarea></p><p><label><input type="checkbox" class="ed-v2"> Version 2, révisée après un premier passage</label></p><p><button type="button" class="chip ed-gen">Générer la consigne</button> <button type="button" class="chip ed-cp">Copier</button></p><p><textarea class="ed-out" rows="12" readonly></textarea></p>');
      var q = function (s) { return el.querySelector(s); };
      var build = function () {
        var on = {}; ctx.$$(".ed-ck", el).forEach(function (i) { if (i.checked) on[i.value] = 1; });
        var v2 = q(".ed-v2").checked, t = "Exercice de simulation pour tester une proposition de politique éducative (groupe de travail Éducation). Ce n'est pas un sondage. Tu vas jouer successivement plusieurs rôles, de façon réaliste et sans caricature, puis donner une synthèse d'analyste.\n\n" + (v2 ? "Voici la VERSION 2 de la proposition, révisée après un premier passage. Pour chaque rôle, dis aussi ce qui a changé pour toi par rapport à la version précédente.\n\n" : "") + "PROPOSITION :\n" + (q(".ed-prop").value.trim() || "[COLLER LA PROPOSITION]") + "\n\nLES RÔLES :\n";
        m.E.personas.filter(function (p) { return on[p.id]; }).forEach(function (p, i) { t += "\n" + (i + 1) + ". " + p.nom + "\nQui c'est : " + p.fiche + "\nCe que tu rends : " + p.grille + "\n"; });
        q(".ed-out").value = t + "\nRÈGLES : réponds dans la voix de chaque rôle, avec ses mots. Ne prête à aucune personne réelle une position qu'elle n'a pas publiée. N'invente aucun chiffre : si un chiffre de la proposition te semble douteux, dis-le.\n\nPUIS, HORS DES RÔLES, en analyste neutre :\n- un tableau des notes et verdicts par rôle ;\n- les mots ou les points qui braquent, et la formulation qui fonctionne ;\n- les cinq modifications les plus utiles, classées, pour rendre la proposition plus solide et plus acceptable sans renoncer aux preuves ni au sérieux budgétaire ;\n- une phrase de message politique par public.";
      };
      q(".ed-gen").addEventListener("click", build); q(".ed-cp").addEventListener("click", function () { build(); if (navigator.clipboard) navigator.clipboard.writeText(q(".ed-out").value); });
    },
    index: function (ctx) { // pour la recherche globale : [{type, titre, texte, sujet, section, carte}]
      var m = model(ctx); if (!m) return []; var E = m.E, o = [];
      E.propositions.forEach(function (p) { var t = m.propTheme[p.id]; o.push({ type: "proposition", titre: p.titre, texte: [p.explication].concat(p.preuves || []).join(" "), sujet: t[0], section: t[1], carte: p.id }); });
      E.sections.themes.forEach(function (T) { T.sections.forEach(function (q) { o.push({ type: "section", titre: q.titre, texte: (q.bref || []).filter(function (x) { return typeof x === "string"; }).join(" "), sujet: T.theme, section: q.id }); (q.sources || []).forEach(function (k) { var s = m.s[k]; if (s) o.push({ type: "source", titre: s.titre, texte: s.resume + " " + s.cle, sujet: T.theme, section: q.id }); }); (q.dossiers || []).forEach(function (k) { var d = m.d[k]; if (d) o.push({ type: "dossier", titre: m.apports[k] || d.titre, texte: d.texte, sujet: T.theme, section: q.id }); }); }); });
      return o;
    }
  };
})();
