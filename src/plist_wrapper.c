#include <stdlib.h>
#include <string.h>
#include <emscripten.h>
#include "plist/plist.h"

// Result structure for returning data to JS
typedef struct {
    int error;
    char* data;
    uint32_t length;
    int format;
} plist_result_t;

static plist_result_t result;

// Helper to clear previous result
static void clear_result(void) {
    if (result.data) {
        free(result.data);
        result.data = NULL;
    }
    result.error = 0;
    result.length = 0;
    result.format = 0;
}

// Get result components
EMSCRIPTEN_KEEPALIVE
int get_error(void) {
    return result.error;
}

EMSCRIPTEN_KEEPALIVE
char* get_data(void) {
    return result.data;
}

EMSCRIPTEN_KEEPALIVE
uint32_t get_length(void) {
    return result.length;
}

EMSCRIPTEN_KEEPALIVE
int get_format(void) {
    return result.format;
}

// Allocate buffer for input data from JS
EMSCRIPTEN_KEEPALIVE
char* alloc_buffer(uint32_t size) {
    return (char*)malloc(size);
}

// Free buffer
EMSCRIPTEN_KEEPALIVE
void free_buffer(char* ptr) {
    if (ptr) free(ptr);
}

// Parse plist and convert to XML
EMSCRIPTEN_KEEPALIVE
void plist_to_xml_wrapper(const char* data, uint32_t length) {
    clear_result();

    plist_t plist = NULL;
    plist_format_t fmt;

    plist_err_t err = plist_from_memory(data, length, &plist, &fmt);
    if (err != PLIST_ERR_SUCCESS) {
        result.error = err;
        return;
    }

    char* xml_data = NULL;
    uint32_t xml_length = 0;

    err = plist_to_xml(plist, &xml_data, &xml_length);
    plist_free(plist);

    if (err != PLIST_ERR_SUCCESS) {
        result.error = err;
        return;
    }

    result.data = xml_data;
    result.length = xml_length;
    result.format = fmt;
}

// Parse plist and convert to binary
EMSCRIPTEN_KEEPALIVE
void plist_to_bin_wrapper(const char* data, uint32_t length) {
    clear_result();

    plist_t plist = NULL;
    plist_format_t fmt;

    plist_err_t err = plist_from_memory(data, length, &plist, &fmt);
    if (err != PLIST_ERR_SUCCESS) {
        result.error = err;
        return;
    }

    char* bin_data = NULL;
    uint32_t bin_length = 0;

    err = plist_to_bin(plist, &bin_data, &bin_length);
    plist_free(plist);

    if (err != PLIST_ERR_SUCCESS) {
        result.error = err;
        return;
    }

    // Copy to our own buffer since plist_mem_free is different
    result.data = (char*)malloc(bin_length);
    if (result.data) {
        memcpy(result.data, bin_data, bin_length);
        result.length = bin_length;
    } else {
        result.error = PLIST_ERR_NO_MEM;
    }
    result.format = fmt;

    plist_mem_free(bin_data);
}

// Parse plist and convert to JSON
EMSCRIPTEN_KEEPALIVE
void plist_to_json_wrapper(const char* data, uint32_t length, int prettify) {
    clear_result();

    plist_t plist = NULL;
    plist_format_t fmt;

    plist_err_t err = plist_from_memory(data, length, &plist, &fmt);
    if (err != PLIST_ERR_SUCCESS) {
        result.error = err;
        return;
    }

    char* json_data = NULL;
    uint32_t json_length = 0;

    err = plist_to_json(plist, &json_data, &json_length, prettify);
    plist_free(plist);

    if (err != PLIST_ERR_SUCCESS) {
        result.error = err;
        return;
    }

    result.data = json_data;
    result.length = json_length;
    result.format = fmt;
}

// Parse plist and convert to OpenStep
EMSCRIPTEN_KEEPALIVE
void plist_to_openstep_wrapper(const char* data, uint32_t length, int prettify) {
    clear_result();

    plist_t plist = NULL;
    plist_format_t fmt;

    plist_err_t err = plist_from_memory(data, length, &plist, &fmt);
    if (err != PLIST_ERR_SUCCESS) {
        result.error = err;
        return;
    }

    char* openstep_data = NULL;
    uint32_t openstep_length = 0;

    err = plist_to_openstep(plist, &openstep_data, &openstep_length, prettify);
    plist_free(plist);

    if (err != PLIST_ERR_SUCCESS) {
        result.error = err;
        return;
    }

    result.data = openstep_data;
    result.length = openstep_length;
    result.format = fmt;
}

// Parse and detect format only
EMSCRIPTEN_KEEPALIVE
void plist_detect_format(const char* data, uint32_t length) {
    clear_result();

    plist_t plist = NULL;
    plist_format_t fmt;

    plist_err_t err = plist_from_memory(data, length, &plist, &fmt);
    if (err != PLIST_ERR_SUCCESS) {
        result.error = err;
        return;
    }

    plist_free(plist);
    result.format = fmt;
}

// Get libplist version
EMSCRIPTEN_KEEPALIVE
const char* get_version(void) {
    return libplist_version();
}
