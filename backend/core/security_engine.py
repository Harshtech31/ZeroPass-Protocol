import grpc
import logging
from core.proto import security_pb2
from core.proto import security_pb2_grpc

logger = logging.getLogger(__name__)

class SecurityEngineClient:
    def __init__(self, address="localhost:50051"):
        self.address = address
        self.channel = grpc.insecure_channel(address)
        self.stub = security_pb2_grpc.SecurityServiceStub(self.channel)

    def get_risk_score(self, user_id: str, device_id: str, ip_address: str):
        """
        Calls the C++ Security Engine to compute a risk score for the login attempt.
        """
        try:
            request = security_pb2.RiskRequest(
                user_id=user_id,
                device_id=device_id,
                ip_address=ip_address
            )
            response = self.stub.GetRiskScore(request, timeout=2.0)
            return {
                "score": response.score,
                "risk_level": response.risk_level
            }
        except grpc.RpcError as e:
            logger.error(f"Failed to connect to Security Engine: {e}")
            # Fallback to a neutral score if the engine is down
            return {"score": 0.0, "risk_level": "UNKNOWN"}

# Singleton instance
security_engine = SecurityEngineClient()
