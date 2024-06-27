const fs = require('fs');
const path = require('path');
const prompt = require('prompt-sync')();
const axios = require('axios');

const readnigga = (dir) => {
  const files = [];
  const items = fs.readdirSync(dir);

  items.forEach((item) => {
    const fullPath = path.join(dir, item);
    const stat = fs.lstatSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...readnigga(fullPath));
    } else {
      files.push(fullPath);
    }
  });

  return files;
};

const relativepath = (filePath, baseDir) => {
  return path.relative(baseDir, filePath).replace(/\\/g, '/');
};

const deleterepo = async (owner, repo, githubtoken) => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
      {
        headers: {
          Authorization: `token ${githubtoken}`,
        },
      }
    );

    const files = response.data.tree.filter(file => file.type === 'blob');

    for (const file of files) {
      await axios.delete(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
        {
          headers: {
            Authorization: `token ${githubtoken}`,
            'Content-Type': 'application/json',
          },
          data: {
            message: `Delete ${file.path}`,
            sha: file.sha,
          },
        }
      );
      console.log(`Deleted: ${file.path}`);
    }
  } catch (error) {
    console.error(`Failed to delete content:`, error.response ? error.response.data.message : error.message);
  }
};

const uploadgithub = async (owner, repo, githubtoken, dirPath) => {
  const files = readnigga(dirPath);

  for (const file of files) {
    const content = fs.readFileSync(file, 'base64');
    const relativePath = relativepath(file, dirPath);

    try {
      const response = await axios.put(
        `https://api.github.com/repos/${owner}/${repo}/contents/${relativePath}`,
        {
          message: 'github-uploader',
          content,
        },
        {
          headers: {
            Authorization: `token ${githubtoken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`Uploaded: ${relativePath}`);
    } catch (error) {
      console.error(`Failed to upload ${relativePath}:`, error.response ? error.response.data.message : error.message);
    }
  }
};

const menu = async () => {
  console.log("1. Supprimer le contenu du repository (delete content repo)");
  console.log("2. Uploader des fichiers sur un repository (add files in repo)");

  const choice = prompt('Veuillez choisir une option (1 ou 2) (choice a option 1 or 2 ) : ');

  const githubtoken = prompt('Identifiant de votre compte GitHub (token) (id of your account github token) : ', { echo: '*' });
  const repourl = prompt('Quelle est votre repository ? (URL) (whats your repo url): ');

  if (!/^https:\/\/github\.com\/.+\/.+/.test(repourl)) {
    console.error('URL du repository GitHub non valide.(url of the repo is not valid)');
    return;
  }

  const [owner, repo] = repourl.replace('https://github.com/', '').split('/');

  if (choice === '1') {
    await deleterepo(owner, repo, githubtoken);
    console.log("Le contenu du repository a été supprimé.(the content of the repo has been delete)");
  } else if (choice === '2') {
    const dirPath = prompt('quelles sont les fichiers à envoyer sur votre GitHub ? (chemin du dossier) (what the files to send a your github : ex: ): C:Users/ser/Desktop/EyesShield2024/');

    if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
      console.error('Le chemin du dossier n\'existe pas ou n\'est pas un dossier valide.(the file doesnt exist or not valid)');
      return;
    }

    await uploadgithub(owner, repo, githubtoken, dirPath);
    console.log("J'ai fini d'upload !(Done!)");
  } else {
    console.error('Option non valide.(option not valid)');
  }
};

menu().catch((error) => {
  console.error('Erreur:', error.message);
});
