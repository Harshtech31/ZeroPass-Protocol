#include <iostream>
#include <memory>
#include <string>
#include <vector>

#include <grpcpp/grpcpp.h>
#include "security.grpc.pb.h"
#include "crypto.h"

using grpc::Server;
using grpc::ServerBuilder;
using grpc::ServerContext;
using grpc::Status;
using zeropass::SecurityService;
using zeropass::SignatureRequest;
using zeropass::SignatureResponse;
using zeropass::RiskRequest;
using zeropass::RiskResponse;
using zeropass::TokenRequest;
using zeropass::TokenResponse;

class SecurityServiceImpl final : public SecurityService::Service {
    Status VerifySignature(ServerContext* context, const SignatureRequest* request,
                         SignatureResponse* reply) override {
        std::cout << "[SecurityEngine] Verifying signature for request" << std::endl;
        
        std::vector<uint8_t> pk(request->public_key().begin(), request->public_key().end());
        std::vector<uint8_t> sig(request->signature().begin(), request->signature().end());
        std::vector<uint8_t> data(request->data().begin(), request->data().end());

        bool valid = zeropass::verify_signature(pk, sig, data);
        reply->set_valid(valid);
        
        if (!valid) {
            reply->set_error_message("Invalid cryptographic signature");
        }
        
        return Status::OK;
    }

    Status GetRiskScore(ServerContext* context, const RiskRequest* request,
                       RiskResponse* reply) override {
        std::cout << "[SecurityEngine] Computing risk score for user: " << request->user_id() << std::endl;
        
        float score = zeropass::compute_risk_score(
            request->user_id(),
            request->device_id(),
            request->ip_address()
        );
        
        reply->set_score(score);
        if (score > 0.7f) reply->set_risk_level("HIGH");
        else if (score > 0.3f) reply->set_risk_level("MEDIUM");
        else reply->set_risk_level("LOW");

        return Status::OK;
    }

    Status ValidateToken(ServerContext* context, const TokenRequest* request,
                        TokenResponse* reply) override {
        // Placeholder for JWT validation in C++
        reply->set_valid(true);
        reply->set_subject("demo_user");
        return Status::OK;
    }
};

void RunServer() {
    std::string server_address("0.0.0.0:50051");
    SecurityServiceImpl service;

    ServerBuilder builder;
    builder.AddListeningPort(server_address, grpc::InsecureServerCredentials());
    builder.RegisterService(&service);
    std::unique_ptr<Server> server(builder.BuildAndStart());
    std::cout << "[SecurityEngine] Server listening on " << server_address << std::endl;
    server->Wait();
}

int main(int argc, char** argv) {
    RunServer();
    return 0;
}
