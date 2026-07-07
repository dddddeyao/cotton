# Cotton Recognition Image Crawler

This crawler collects open-license cotton-recognition images into one dataset
layout:

- `raw/` downloaded images
- `metadata/` one JSON metadata file per image
- `manifest.csv` combined index
- `runs/<timestamp>/manifest.jsonl` append-only run log
- `runs/<timestamp>/candidates.json` candidate records for the run

`datasets/` is ignored by Git, so downloaded images stay local.

## Sources

| Source | Best for |
| --- | --- |
| Openverse | cotton lint, raw cotton, seed cotton, opened cotton boll, broad CC image search |
| iNaturalist | real Gossypium plant, leaf, flower, seedling, boll field photos |
| GBIF | biodiversity occurrence images for Gossypium taxa |
| Wikimedia Commons | stable fallback with strong source/license metadata |

## Quick Batches

Start with Openverse because it is usually the broadest for cotton lint and raw
cotton:

```powershell
python tools/dataset/crawl_cotton_images.py --sources openverse --limit 80 --per-query-limit 20 --workers 4 --delay 1
```

Then collect plant/leaf/boll field photos:

```powershell
python tools/dataset/crawl_cotton_images.py --sources inaturalist,gbif --limit 80 --per-query-limit 30 --workers 3 --delay 1.5
```

Use Commons as a slower but well-documented supplement:

```powershell
python tools/dataset/crawl_cotton_images.py --sources commons --limit 50 --per-query-limit 15 --workers 2 --delay 3
```

Rebuild the CSV after interrupted runs:

```powershell
python tools/dataset/crawl_cotton_images.py --rebuild-manifest
```

## Focus Keywords

Default keywords target these recognition-relevant categories:

- 棉絮 / 棉绒: `cotton lint`, `raw cotton`, `seed cotton`
- 棉铃开裂: `opened cotton boll`, `mature cotton boll`, `cotton boll close up`
- 棉花植株: `cotton plant close up`, `Gossypium hirsutum`, `Gossypium barbadense`
- 棉纤维细节: `cotton fiber macro`
- 棉叶与病害: `cotton leaf disease`, `cotton seedling`

Add custom terms with repeated `--query`, `--taxon`, and `--category` flags.
