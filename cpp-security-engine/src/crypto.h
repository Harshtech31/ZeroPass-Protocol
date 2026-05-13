#pragma once

#include <string>
#include <vector>
#include <openssl/evp.h>
#include <openssl/err.h>

namespace zeropass {

/**
 * Verifies a WebAuthn/FIDO2 signature using OpenSSL.
 * @param public_key  DER-encoded public key bytes
 * @param signature   Raw signature bytes
 * @param data        Signed data (authData + clientDataHash)
 * @return true if signature is valid
 */
bool verify_signature(
    const std::vector<uint8_t>& public_key,
    const std::vector<uint8_t>& signature,
    const std::vector<uint8_t>& data
);

/**
 * Compute a risk score [0.0, 1.0] for a login request.
 * Higher = riskier.
 */
float compute_risk_score(
    const std::string& user_id,
    const std::string& device_id,
    const std::string& ip_address
);

} // namespace zeropass
