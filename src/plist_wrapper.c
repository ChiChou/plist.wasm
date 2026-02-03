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

EMSCRIPTEN_KEEPALIVE
plist_result_t* result_alloc(void) {
    return (plist_result_t*)calloc(1, sizeof(plist_result_t));
}

EMSCRIPTEN_KEEPALIVE
void result_free(plist_result_t* res) {
    free(res->data);
    free(res);
}

EMSCRIPTEN_KEEPALIVE
int result_get_error(plist_result_t* res) { return res->error; }

EMSCRIPTEN_KEEPALIVE
char* result_get_data(plist_result_t* res) { return res->data; }

EMSCRIPTEN_KEEPALIVE
uint32_t result_get_length(plist_result_t* res) { return res->length; }

EMSCRIPTEN_KEEPALIVE
int result_get_format(plist_result_t* res) { return res->format; }

EMSCRIPTEN_KEEPALIVE
char* alloc_buffer(uint32_t size) { return (char*)malloc(size); }

EMSCRIPTEN_KEEPALIVE
void free_buffer(char* ptr) { free(ptr); }

EMSCRIPTEN_KEEPALIVE
plist_t plist_parse(plist_result_t* res, const char* data, uint32_t length) {
    plist_t plist = NULL;
    plist_format_t fmt;
    res->error = plist_from_memory(data, length, &plist, &fmt);
    res->format = fmt;
    return plist;
}

EMSCRIPTEN_KEEPALIVE
void plist_free_handle(plist_t plist) {
    plist_free(plist);
}

EMSCRIPTEN_KEEPALIVE
void plist_to_xml_wrapper(plist_result_t* res, plist_t plist) {
    res->error = plist_to_xml(plist, &res->data, &res->length);
}

EMSCRIPTEN_KEEPALIVE
void plist_to_bin_wrapper(plist_result_t* res, plist_t plist) {
    char* bin_data = NULL;
    uint32_t bin_length = 0;
    res->error = plist_to_bin(plist, &bin_data, &bin_length);
    if (res->error == PLIST_ERR_SUCCESS) {
        res->data = (char*)malloc(bin_length);
        memcpy(res->data, bin_data, bin_length);
        res->length = bin_length;
        plist_mem_free(bin_data);
    }
}

EMSCRIPTEN_KEEPALIVE
void plist_to_json_wrapper(plist_result_t* res, plist_t plist, int prettify) {
    res->error = plist_to_json(plist, &res->data, &res->length, prettify);
}

EMSCRIPTEN_KEEPALIVE
void plist_to_openstep_wrapper(plist_result_t* res, plist_t plist, int prettify) {
    res->error = plist_to_openstep(plist, &res->data, &res->length, prettify);
}

EMSCRIPTEN_KEEPALIVE
const char* get_version(void) {
    return libplist_version();
}
