import sys
import io
import os
import re
import glob
from PIL import Image, ImageOps


def main():
    raiz = sys.argv[1]
    arquivo = sys.argv[2]
    img_dir = os.path.join(raiz, "img")
    seed = os.path.join(raiz, "js", "fotos-seed.js")

    numeros = []
    for c in glob.glob(os.path.join(img_dir, "foto-pc-*.jpg")):
        m = re.match(r"foto-pc-(\d+)\.jpg$", os.path.basename(c))
        if m:
            numeros.append(int(m.group(1)))
    n = (max(numeros) + 1) if numeros else 1
    nome = "foto-pc-%03d.jpg" % n
    destino = os.path.join(img_dir, nome)

    im = Image.open(arquivo)
    im = ImageOps.exif_transpose(im)
    if im.mode != "RGB":
        im = im.convert("RGB")
    im.thumbnail((1100, 1100))
    im.save(destino, "JPEG", quality=68, optimize=True)

    with io.open(seed, encoding="utf-8", newline="") as f:
        txt = f.read()
    if ('"%s"' % nome) not in txt:

        def insere(m):
            virgula = "" if m.group(2).endswith(",") else ","
            nl = m.group(1)
            return (
                nl
                + m.group(2)
                + virgula
                + nl
                + '    "%s"' % nome
                + nl
                + m.group(4)
                + m.group(5)
            )

        novo, qtd = re.subn(
            r'(\r?\n)(    "[^"\r\n]+",?)(\r?\n)(  \],)(\r?\n  "origem")',
            insere,
            txt,
            count=1,
        )
        if qtd == 0:
            novo, qtd = re.subn(
                r'(\r?\n)(    "[^"\r\n]+",?)(\r?\n)(  \])',
                lambda m: m.group(1)
                + m.group(2)
                + ("" if m.group(2).endswith(",") else ",")
                + m.group(1)
                + '    "%s"' % nome
                + m.group(1)
                + m.group(4),
                txt,
                count=1,
            )
        if qtd == 0:
            sys.stderr.write("nao foi possivel atualizar fotos-seed.js")
            sys.exit(1)
        with io.open(seed, "w", encoding="utf-8", newline="") as f:
            f.write(novo)

    sys.stdout.write(nome)


if __name__ == "__main__":
    main()
