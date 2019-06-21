using System;
using System.Linq;
using UnityEngine;
using SystemHalf;

[ExecuteInEditMode]
public class ExportMeshData : MonoBehaviour
{
    public bool run;

    void Update()
    {
        if (run) 
        {
            run = false;
            doRun();
        }
    }

    static readonly float[] SHIP_VERTS = (new double[] {
        0.25, 0, 0.11, -0.02, 0.13, -0.08, 0.05, -0.05, 0, -0.06, -0.03, -0.12, -0, -0.17, -0.09, -0.15, -0.11, -0.08, -0.16, -0.09, -0.16, -0.03, -0.13, 0, -0.16, 0.03, -0.16, 0.09, -0.11, 0.08, -0.09, 0.15, -0, 0.17, -0.03, 0.12, 0, 0.06, 0.05, 0.05, 0.13, 0.08, 0.11, 0.02
    }).Select(x => (float)x).ToArray();

    void doRun()
    {
        Debug.Log(floatsToHalfsInBase64String(SHIP_VERTS));
    }

    static string floatsToHalfsInBase64String(float[] data)
    {
        return ushortsToBase64String(data.Select(x => Half.GetBits((Half)x)).ToArray());
    }

    static string ushortsToBase64String(ushort[] data)
    {
        var bytes = new byte[data.Length * 2];

        for (int i = 0; i < data.Length; ++i)
        {
            bytes[2*i+0] = (byte)((data[i] & 0xFF00) >> 8);
            bytes[2*i+1] = (byte)(data[i] & 0x00FF);
        }

        return Convert.ToBase64String(bytes);
    }
}
