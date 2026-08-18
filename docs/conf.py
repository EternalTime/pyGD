import os
import sys

# The pyGD package lives one level above docs/; its parent goes on the path so
# ``import pyGD`` resolves for autodoc.
sys.path.insert(0, os.path.abspath("../.."))

project = "pyGD"
author = "Damian R. Sowinski"
copyright = "2026, Damian R. Sowinski"
release = "0.1.0"

extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.napoleon",
    "sphinx.ext.mathjax",
    "sphinx.ext.viewcode",
    "sphinxcontrib.bibtex",
    "sphinx_copybutton",
]

copybutton_prompt_text = r">>> "
copybutton_prompt_is_regexp = True

# Citations render as footnotes at the bottom of each page (footcite /
# footbibliography). The master copy of references.bib lives in the website
# repo at assets/data/references.bib; the entries used here are mirrored in
# docs/references.bib so the repo builds standalone.
bibtex_bibfiles = ["references.bib"]

# Bibliography style: the entry's url is carried by its title as a link
# instead of being printed as a bare URL after the entry.
import pybtex.plugin
from pybtex.style.formatting.unsrt import Style as UnsrtStyle
from pybtex.style.template import field, href, optional, sentence, tag


class LinkedTitleStyle(UnsrtStyle):
    def format_title(self, e, which_field, as_sentence=True):
        formatted_title = field(
            which_field, apply_func=lambda text: text.capitalize()
        )
        if "url" in e.fields:
            formatted_title = href[field("url", raw=True), formatted_title]
        if as_sentence:
            return sentence[formatted_title]
        return formatted_title

    def format_btitle(self, e, which_field, as_sentence=True):
        formatted_title = tag("em")[field(which_field)]
        # Link only the entry's own title, not e.g. an incollection's
        # booktitle, so each entry carries exactly one link.
        if "url" in e.fields and which_field == "title":
            formatted_title = href[field("url", raw=True), formatted_title]
        if as_sentence:
            return sentence[formatted_title]
        return formatted_title

    def format_web_refs(self, e):
        # The url now lives on the title; print nothing here.
        return sentence[optional[self.format_eprint(e)]]


pybtex.plugin.register_plugin(
    "pybtex.style.formatting", "linkedtitle", LinkedTitleStyle
)
bibtex_default_style = "linkedtitle"

napoleon_numpy_docstring = True
napoleon_google_docstring = False

templates_path = ["_templates"]
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]

html_theme = "sphinx_rtd_theme"
html_static_path = ["_static"]
html_css_files = ["custom.css"]

autodoc_member_order = "bysource"
