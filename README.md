# Programmes 2027 · site privé

Site statique chiffré. Tout le contenu est dans `content.enc.json`, chiffré en AES-256-GCM ;
la clé de contenu est enveloppée pour chaque utilisateur autorisé (adresse e-mail + mot de passe, PBKDF2-SHA256, 600 000 itérations).
Le déchiffrement se fait uniquement dans le navigateur. Aucun texte en clair n'est publié dans ce dépôt.
