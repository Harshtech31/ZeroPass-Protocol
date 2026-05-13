#include "crypto.h"
#include <openssl/evp.h>
#include <openssl/err.h>
#include <openssl/x509.h>
#include <stdexcept>

namespace zeropass {

bool verify_signature(
    const std::vector<uint8_t>& public_key,
    const std::vector<uint8_t>& signature,
    const std::vector<uint8_t>& data
) {
    EVP_PKEY* pkey = nullptr;
    const uint8_t* pk_ptr = public_key.data();
    pkey = d2i_PUBKEY(nullptr, &pk_ptr, static_cast<long>(public_key.size()));
    if (!pkey) return false;

    EVP_MD_CTX* ctx = EVP_MD_CTX_new();
    if (!ctx) { EVP_PKEY_free(pkey); return false; }

    bool valid = false;
    if (EVP_DigestVerifyInit(ctx, nullptr, EVP_sha256(), nullptr, pkey) == 1 &&
        EVP_DigestVerifyUpdate(ctx, data.data(), data.size()) == 1 &&
        EVP_DigestVerifyFinal(ctx, signature.data(), signature.size()) == 1) {
        valid = true;
    }

    EVP_MD_CTX_free(ctx);
    EVP_PKEY_free(pkey);
    return valid;
}

float compute_risk_score(
    const std::string& user_id,
    const std::string& device_id,
    const std::string& ip_address
) {
    // Placeholder: replace with ML model or heuristics
    // Score 0.0 = safe, 1.0 = high risk
    float score = 0.0f;
    if (ip_address.starts_with("10.") || ip_address.starts_with("192.168.")) {
        score += 0.0f; // trusted network
    } else {
        score += 0.3f; // external IP
    }
    if (device_id.empty()) score += 0.4f;
    return std::min(score, 1.0f);
}

} // namespace zeropass
