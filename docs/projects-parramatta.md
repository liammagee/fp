% Fierce Planet

# Basic Parramatta River Model

[Open in a new window](projects/parramatta-river/basic.html)


# Camelia

[Open in a new window](projects/parramatta-river/camelia.html)

Commands to generate the high-res geography:

1. Download the following digital elevation files from [USGS](http://earthexplorer.usgs.gov/):
   
    - s34_e150_1arc_v3.tif
    - s34_e151_1arc_v3.tif
    - s35_e150_1arc_v3.tif
    - s35_e151_1arc_v3.tif


2. Merge with:

    gdal_merge.py -o Greater-Sydney.tif s34_e150_1arc_v3.tif s34_e151_1arc_v3.tif s35_e150_1arc_v3.tif s35_e151_1arc_v3.tif

3.  Sample Camelia from the merged file:

    gdal_translate -srcwin 3300 3000 601 601 Greater-Sydney.tif Camelia.tif

4.  Convert to headless heightmap:

    gdal_translate -ot UInt16 -outsize 601 601 -of ENVI Camelia.tif Camelia.bin
