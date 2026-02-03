#!/bin/bash
set -e

# Source EMSDK
source ./emsdk/emsdk_env.sh 2>/dev/null || true

BUILD_DIR="build"
DIST_DIR="dist"
LIBPLIST_DIR="libplist"
LIBCNARY_DIR="$LIBPLIST_DIR/libcnary"

# Create build directories
mkdir -p "$BUILD_DIR"
mkdir -p "$DIST_DIR"

echo "=== Compiling libcnary ==="
emcc -O3 \
    -I"$LIBCNARY_DIR/include" \
    -c "$LIBCNARY_DIR/node.c" -o "$BUILD_DIR/node.o"
emcc -O3 \
    -I"$LIBCNARY_DIR/include" \
    -c "$LIBCNARY_DIR/node_list.c" -o "$BUILD_DIR/node_list.o"

echo "=== Compiling libplist ==="
PLIST_SOURCES=(
    "plist.c"
    "bplist.c"
    "xplist.c"
    "jplist.c"
    "oplist.c"
    "hashtable.c"
    "bytearray.c"
    "ptrarray.c"
    "time64.c"
    "base64.c"
    "jsmn.c"
)

for src in "${PLIST_SOURCES[@]}"; do
    name="${src%.c}"
    echo "  Compiling $src..."
    emcc -O3 \
        -I"$LIBPLIST_DIR/include" \
        -I"$LIBPLIST_DIR/src" \
        -I"$LIBCNARY_DIR/include" \
        -DHAVE_STRNDUP=1 \
        -DPACKAGE_VERSION=\"2.6.0\" \
        -c "$LIBPLIST_DIR/src/$src" -o "$BUILD_DIR/$name.o"
done

echo "=== Compiling wrapper ==="
emcc -O3 \
    -I"$LIBPLIST_DIR/include" \
    -c "src/plist_wrapper.c" -o "$BUILD_DIR/plist_wrapper.o"

echo "=== Linking WASM module ==="
OBJECTS=(
    "$BUILD_DIR/node.o"
    "$BUILD_DIR/node_list.o"
    "$BUILD_DIR/plist.o"
    "$BUILD_DIR/bplist.o"
    "$BUILD_DIR/xplist.o"
    "$BUILD_DIR/jplist.o"
    "$BUILD_DIR/oplist.o"
    "$BUILD_DIR/hashtable.o"
    "$BUILD_DIR/bytearray.o"
    "$BUILD_DIR/ptrarray.o"
    "$BUILD_DIR/time64.o"
    "$BUILD_DIR/base64.o"
    "$BUILD_DIR/jsmn.o"
    "$BUILD_DIR/plist_wrapper.o"
)

emcc -O3 \
    "${OBJECTS[@]}" \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s EXPORT_NAME="createPlistModule" \
    -s EXPORTED_FUNCTIONS='["_result_alloc","_result_free","_result_get_error","_result_get_data","_result_get_length","_result_get_format","_alloc_buffer","_free_buffer","_plist_parse","_plist_free_handle","_plist_to_xml_wrapper","_plist_to_bin_wrapper","_plist_to_json_wrapper","_plist_to_openstep_wrapper","_get_version","_malloc","_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["UTF8ToString","stringToUTF8","HEAPU8"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=16777216 \
    -o "$DIST_DIR/plist_wasm.mjs"

echo "=== Copying JS wrapper ==="
cp src/plist.mjs "$DIST_DIR/plist.mjs"

echo "=== Build complete ==="
echo "Output files in $DIST_DIR:"
ls -la "$DIST_DIR"
