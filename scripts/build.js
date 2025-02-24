const fs = require('fs');
const _ = require('lodash');
const rimraf = require('rimraf');
const ejs = require('ejs');

const exportDir = process.argv[2];
const recipes = JSON.parse(fs.readFileSync(`./${exportDir}/recipes.json`));

const publicDir = './docs';

const indexTemplate = ejs.compile(`
<!DOCTYPE html><html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Backup de Cocineros Argentinos</title>
    <meta name="format-detection" content="telephone=no">
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
    />
</head>
<body>
    <div class="container" style="padding-top: 1rem">
        <h1>Backup de recetas de Cocineros Argentinos</h1>

        <p>Este es un backup <i>rápido y furioso</i> de las recetas disponibles en el sitio de Cocineros Argentinos. Podés ver el código fuente del scraper y el generador de este sitio en <a href="https://github.com/fcingolani/backup-cocineros-argentinos">Github</a>. También podés <a href="https://github.com/fcingolani/backup-cocineros-argentinos/tree/main/data/">bajarte el JSON</a> con todas las recetas.</p>

        <hr />
        <% Object.keys(recipes).sort().forEach(function (category){ %>
            <details>
                <summary><%= category == 'undefined' ? "Otros" : category %></summary>
                <ul>
                    <% recipes[category].sort((a, b) => a.title < b.title ? -1 : 1).forEach(function (recipe){ if(recipe){ %>
                    <li>
                        <a href="<%= recipe.sourceURL.split('/').pop() %>.html"><%= recipe.title.toUpperCase() %></a> <% if(recipe.videoURL){ %>📺<% } %>
                    </li>
                    <% }}); %>
                </ul>
            </details>
            <hr />
        <% }); %>

        <p style="text-align: center;">Scrapeado con ❤️ por <a href="https://fcingolani.com.ar">@fcingolani</a>.</p>
    </div>
</body>
`);

const recipeTemplate = ejs.compile(`
<!DOCTYPE html><html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><%= recipe.title %> - Backup de Cocineros Argentinos</title>
    <meta name="format-detection" content="telephone=no">
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
    />
</head>
<body>
    <div class="container" style="padding-top: 1rem">
        <h1>Backup de recetas de Cocineros Argentinos</h1>
        <a href="index.html">Ir al inicio</a>
        <hr />

        <h2><%= recipe.title %></h2>

        <% if(recipe.videoURL){ %>
            <p>
                <iframe style="width: 100%; height: 20rem; " src="<%= recipe.videoURL.replace("watch?v=", "embed/") %>"></iframe>
            </p>
        <% } %>

        <div class="grid">
            <div>
                <%- recipe.ingredients %>
            </div>
            <div style="background-image: url('images/<%= recipe.imageFile %>'); background-size: contain; background-position: top right;">
            
            </div>
        </div>
        
        <%- recipe.description %>

        <hr />
        <p style="text-align: center;">Scrapeado con ❤️ por <a href="https://fcingolani.com.ar">@fcingolani</a>.</p>
    </div>
</body>
`);

async function generateIndex(recipes, filePath){
    fs.writeFileSync(filePath, indexTemplate({
        recipes: _.groupBy(_.compact(recipes), 'category')
    }))
}

async function generateRecipe(recipe, filePath){
    recipe.ingredients = recipe.ingredients.replace("\n", "<br/>");
    recipe.description = recipe.description.replace("\n", "<br/>");

    fs.writeFileSync(filePath, recipeTemplate({
        recipe
    }))
}


(async function (){
    rimraf.sync(publicDir);
    fs.mkdirSync(publicDir);
    fs.mkdirSync(`${publicDir}/images`);
    generateIndex(recipes, `${publicDir}/index.html`);

    _.compact(recipes).forEach(recipe => {
        generateRecipe(recipe, `${publicDir}/${recipe.sourceURL.split('/').pop()}.html`)
        if(recipe.imageFile && fs.existsSync(`${exportDir}/images/${recipe.imageFile}`)){
            fs.copyFileSync(`${exportDir}/images/${recipe.imageFile}`, `${publicDir}/images/${recipe.imageFile}`)
        }
    })
})()