using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using System.IO;

[ExecuteInEditMode]
public class ExportAsM8 : MonoBehaviour
{
    public bool run = false;

    void Update()
    {
        if (run)
        {
            run = false;
            doRun();
        }
    }

    static byte packScale(float f)
    {
        return (byte)(f * 256.0f / 8.0f);
    }

    static float unpackScale(byte b)
    {
        return b / 256.0f * 8.0f;
    }

    static byte[] packVec3(Bounds bounds, Vector3 v)
    {
        return new byte[] {
            (byte)(255.0f * (v.x - bounds.min.x) / bounds.size.x),
            (byte)(255.0f * (v.y - bounds.min.y) / bounds.size.y),
            (byte)(255.0f * (v.z - bounds.min.z) / bounds.size.z)
        };
    }

    void doRun()
    {
        var result = new List<byte>();
        var mesh = GetComponent<MeshFilter>().sharedMesh;

        var originBytes = packVec3(mesh.bounds, Vector3.zero);

        result.AddRange(new byte[] {
            packScale(mesh.bounds.size.x),
            packScale(mesh.bounds.size.y),
            packScale(mesh.bounds.size.z),

            originBytes[0],
            originBytes[1],
            originBytes[2],

            (byte)mesh.vertices.Length
        });

        result.AddRange(mesh.vertices.SelectMany(v => packVec3(mesh.bounds, v)));

        for (int i = 0; i < 30; ++i)
        Debug.Log(mesh.vertices[i]);

        result.AddRange(mesh.triangles.Select(t => (byte)t));

        File.WriteAllBytes(Application.dataPath + "/exported.m8", result.ToArray());
    }
}

