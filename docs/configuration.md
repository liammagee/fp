% Fierce Planet

## Overview

These notes cover a range of different topics for using or extending the *Fierce Planet* application.



## Adding 1 Arc-Second (30m) resolution terrain:

1. Visit http://earthexplorer.usgs.gov/ (register if necessary)
    - Enter search criteria (e.g. "Sydney")
    - Customise coordinates to fit desired region
    - Click the "Data Sets" button 
    - Expand "Digital Elevation"
    - Expand "SRTM"
    - Select "SRTM 1 Arc-Second Global"
    - Click "Results"
    - Download *all* of the resulting tiles in GeoTIFF format
2. To merge the downloaded files (if e.g. 4 tiles are downloaded):

```
    gdal_merge.py -o Sydney.tif s34_e150_1arc_v3.tif s34_e151_1arc_v3.tif s35_e150_1arc_v3.tif s35_e151_1arc_v3.tif
```

3. Check the resulting merged tif file.
4. To get the dimensions of the merged tif file:

```
    gdalinfo Sydney.tif
```

5. To select a sample of the resulting tif:

    - Suppose the file is 7201 x 7201 pixels, and the desired region is a square offset by 25% on the x axis and 12.5% on the y axis

```
    gdal_translate -srcwin 1800 900 3601 3601 Sydney.tif Sydney-local.tif
```

6.  Then to translate to a header-less heightmap file of appropriate scale, where '1000' is in metres, and '65535' represents the maximum value of 2 bytes.

```

    gdal_translate -scale 0 1000 0 65535 -ot UInt16 -outsize 900 900 -of ENVI Sydney-local.tif Sydney-local.bin

```

