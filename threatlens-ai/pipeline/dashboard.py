import streamlit as st
import pandas as pd
import plotly.express as px
import os

st.set_page_config(page_title="ThreatLens AI Dashboard", layout="wide")

st.title("🛡️ ThreatLens AI Security Dashboard")
st.markdown("Real-time monitoring of multi-layered security pipeline.")

LOG_FILE = "security_logs.csv"

def load_data():
    if os.path.exists(LOG_FILE):
        return pd.read_csv(LOG_FILE)
    return pd.DataFrame(columns=["timestamp", "identifier", "status", "layer", "reason", "count"])

data = load_data()

if not data.empty:
    # --- METRICS ---
    col1, col2, col3 = st.columns(3)
    
    total_reqs = len(data)
    blocked_reqs = len(data[data['status'] == 'BLOCKED'])
    allowed_reqs = len(data[data['status'] == 'ALLOWED'])
    
    col1.metric("Total Requests", total_reqs)
    col2.metric("Blocked", blocked_reqs, delta=f"{(blocked_reqs/total_reqs)*100:.1f}%", delta_color="inverse")
    col3.metric("Allowed", allowed_reqs, delta=f"{(allowed_reqs/total_reqs)*100:.1f}%")

    # --- VISUALIZATIONS ---
    st.markdown("### Attack Distribution")
    fig_layer = px.pie(data, names='layer', title="Blocked Requests by Layer", 
                       color_discrete_sequence=px.colors.sequential.RdBu)
    st.plotly_chart(fig_layer)

    st.markdown("### Traffic Timeline")
    fig_time = px.line(data, x='timestamp', y='status', markers=True, 
                       title="Request Status over Time")
    st.plotly_chart(fig_time)

    # --- LOGS TABLE ---
    st.markdown("### Detailed Security Logs")
    st.dataframe(data.sort_values(by="timestamp", ascending=False), use_container_width=True)

else:
    st.info("No logs found yet. Start the API and send some requests to see data here!")

if st.button("Refresh Data"):
    st.rerun()
