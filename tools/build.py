#!/usr/bin/env python3
"""SALAMA WMS – assemblage de la page unique servie par GitHub Pages (index.html).

© 2026 JPN Management Consulting – Tous droits réservés. Client : SALAMA.
Usage : python3 tools/build.py  (depuis la racine du dépôt)
"""
import pathlib

RACINE = pathlib.Path(__file__).resolve().parent.parent
MODULES = [
    '01-referentiels.js', '02-noyau.js', '03-interface.js', '04-entrees-stock.js',
    '05-ressources-humaines.js', '06-douchette.js', '07-distribution-tracabilite.js',
    '08-controles-integrite.js', '09-signature.js', '10-redevabilite-interoperabilite.js',
    '11-authentification-comptes.js', '12-langues.js',
]
BIBLIOTHEQUES = ['jspdf.umd.min.js', 'xlsx.full.min.js', 'qrcode.js', 'JsBarcode.all.min.js']
POLICES = ('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600'
           '&family=Merriweather+Sans:wght@600;700;800&family=Source+Sans+3:wght@400;600;700&display=swap')


def lire(chemin):
    return (RACINE / chemin).read_text(encoding='utf-8')


def script(code):
    return '<script>\n' + code.replace('</script', '<\\/script') + '\n</script>\n'


def assembler():
    css = lire('src/styles.css')
    js = '\n'.join(lire('src/' + m) for m in MODULES)
    libs = ''.join(script(lire('vendor/' + b)) for b in BIBLIOTHEQUES)
    page = (
        '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="author" content="JPN Management Consulting">'
        '<meta name="description" content="SALAMA WMS – démonstrateur multi-sites (entrepôts et distribution)">'
        '<meta name="robots" content="noindex,nofollow"></head><body>'
        '<title>SALAMA WMS</title>'
        '<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        f'<link rel="stylesheet" href="{POLICES}">'
        f'<style>{css}\n#root{{min-height:100vh}}</style>'
        '<div id="root"><p style="padding:24px;font-family:system-ui">Chargement du WMS SALAMA…</p></div>\n'
        + libs + script(js) + '</body></html>'
    )
    (RACINE / 'index.html').write_text(page, encoding='utf-8')
    print(f'index.html : {len(page):,} caractères, {len(MODULES)} modules')


if __name__ == '__main__':
    assembler()
