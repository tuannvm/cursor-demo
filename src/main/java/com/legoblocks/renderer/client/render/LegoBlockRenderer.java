package com.legoblocks.renderer.client.render;

import com.legoblocks.renderer.block.LegoBlock;
import com.legoblocks.renderer.tileentity.LegoBlockTileEntity;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import com.mojang.math.Matrix3f;
import com.mojang.math.Matrix4f;
import com.mojang.math.Vector3f;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.blockentity.BlockEntityRenderer;
import net.minecraft.client.renderer.blockentity.BlockEntityRendererProvider;
import net.minecraft.core.Direction;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.util.Mth;

public class LegoBlockRenderer implements BlockEntityRenderer<LegoBlockTileEntity> {
    
    private static final ResourceLocation LEGO_TEXTURE = new ResourceLocation("legoblocks", "textures/blocks/lego_brick.png");
    
    public LegoBlockRenderer(BlockEntityRendererProvider.Context context) {
    }

    @Override
    public void render(LegoBlockTileEntity tileEntity, float partialTicks, PoseStack poseStack, 
                      MultiBufferSource bufferSource, int combinedLight, int combinedOverlay) {
        
        LegoBlock.BrickType brickType = tileEntity.getBrickType();
        if (brickType == null) return;

        poseStack.pushPose();
        
        // Apply rotation if any
        if (tileEntity.getRotationY() != 0) {
            poseStack.translate(0.5, 0, 0.5);
            poseStack.mulPose(Vector3f.YP.rotationDegrees(tileEntity.getRotationY()));
            poseStack.translate(-0.5, 0, -0.5);
        }

        VertexConsumer vertexBuilder = bufferSource.getBuffer(RenderType.solid());
        
        // Get color
        int color = tileEntity.getColor();
        float red = ((color >> 16) & 0xFF) / 255.0f;
        float green = ((color >> 8) & 0xFF) / 255.0f;
        float blue = (color & 0xFF) / 255.0f;
        float alpha = 1.0f;

        // Render based on brick type
        switch (brickType) {
            case BRICK_1X1 -> renderBrick1x1(poseStack, vertexBuilder, red, green, blue, alpha, combinedLight, combinedOverlay);
            case BRICK_2X2 -> renderBrick2x2(poseStack, vertexBuilder, red, green, blue, alpha, combinedLight, combinedOverlay);
            case BRICK_2X4 -> renderBrick2x4(poseStack, vertexBuilder, red, green, blue, alpha, combinedLight, combinedOverlay);
            case SLOPE -> renderSlope(poseStack, vertexBuilder, red, green, blue, alpha, combinedLight, combinedOverlay);
            case CORNER -> renderCorner(poseStack, vertexBuilder, red, green, blue, alpha, combinedLight, combinedOverlay);
        }

        poseStack.popPose();
    }

    private void renderBrick1x1(PoseStack poseStack, VertexConsumer builder, float r, float g, float b, float a, int light, int overlay) {
        Matrix4f matrix = poseStack.last().pose();
        Matrix3f normalMatrix = poseStack.last().normal();
        
        // Render base brick body
        renderCube(matrix, normalMatrix, builder, 0.0625f, 0, 0.0625f, 0.9375f, 0.6f, 0.9375f, r, g, b, a, light, overlay);
        
        // Render stud
        renderCylinder(matrix, normalMatrix, builder, 0.25f, 0.6f, 0.25f, 0.75f, 0.9f, 0.75f, r, g, b, a, light, overlay);
    }

    private void renderBrick2x2(PoseStack poseStack, VertexConsumer builder, float r, float g, float b, float a, int light, int overlay) {
        Matrix4f matrix = poseStack.last().pose();
        Matrix3f normalMatrix = poseStack.last().normal();
        
        // Render base brick body
        renderCube(matrix, normalMatrix, builder, 0, 0, 0, 1, 0.6f, 1, r, g, b, a, light, overlay);
        
        // Render 4 studs in 2x2 pattern
        float studSize = 0.25f;
        float studSpacing = 0.5f;
        float studHeight = 0.3f;
        
        for (int i = 0; i < 2; i++) {
            for (int j = 0; j < 2; j++) {
                float x1 = 0.125f + i * studSpacing;
                float z1 = 0.125f + j * studSpacing;
                float x2 = x1 + studSize;
                float z2 = z1 + studSize;
                
                renderCylinder(matrix, normalMatrix, builder, x1, 0.6f, z1, x2, 0.6f + studHeight, z2, r, g, b, a, light, overlay);
            }
        }
    }

    private void renderBrick2x4(PoseStack poseStack, VertexConsumer builder, float r, float g, float b, float a, int light, int overlay) {
        Matrix4f matrix = poseStack.last().pose();
        Matrix3f normalMatrix = poseStack.last().normal();
        
        // Render base brick body (2x4 means 2 wide, 4 long)
        renderCube(matrix, normalMatrix, builder, 0, 0, 0, 1, 0.6f, 2, r, g, b, a, light, overlay);
        
        // Render 8 studs in 2x4 pattern
        float studSize = 0.25f;
        float studSpacing = 0.5f;
        float studHeight = 0.3f;
        
        for (int i = 0; i < 2; i++) {
            for (int j = 0; j < 4; j++) {
                float x1 = 0.125f + i * studSpacing;
                float z1 = 0.125f + j * studSpacing;
                float x2 = x1 + studSize;
                float z2 = z1 + studSize;
                
                renderCylinder(matrix, normalMatrix, builder, x1, 0.6f, z1, x2, 0.6f + studHeight, z2, r, g, b, a, light, overlay);
            }
        }
    }

    private void renderSlope(PoseStack poseStack, VertexConsumer builder, float r, float g, float b, float a, int light, int overlay) {
        Matrix4f matrix = poseStack.last().pose();
        Matrix3f normalMatrix = poseStack.last().normal();
        
        // Render sloped brick - lower section
        renderCube(matrix, normalMatrix, builder, 0, 0, 0, 1, 0.3f, 1, r, g, b, a, light, overlay);
        
        // Render upper sloped section
        renderCube(matrix, normalMatrix, builder, 0, 0.3f, 0.5f, 1, 0.6f, 1, r, g, b, a, light, overlay);
        
        // Render sloped face (connect lower front to upper back)
        renderSlopedFace(matrix, normalMatrix, builder, r, g, b, a, light, overlay);
        
        // Single stud on the flat top
        renderCylinder(matrix, normalMatrix, builder, 0.25f, 0.6f, 0.625f, 0.75f, 0.9f, 0.875f, r, g, b, a, light, overlay);
    }

    private void renderCorner(PoseStack poseStack, VertexConsumer builder, float r, float g, float b, float a, int light, int overlay) {
        Matrix4f matrix = poseStack.last().pose();
        Matrix3f normalMatrix = poseStack.last().normal();
        
        // Render base corner piece
        renderCube(matrix, normalMatrix, builder, 0, 0, 0, 1, 0.6f, 1, r, g, b, a, light, overlay);
        
        // Single corner stud
        renderCylinder(matrix, normalMatrix, builder, 0.125f, 0.6f, 0.125f, 0.375f, 0.9f, 0.375f, r, g, b, a, light, overlay);
    }

    private void renderCube(Matrix4f matrix, Matrix3f normalMatrix, VertexConsumer builder, 
                           float x1, float y1, float z1, float x2, float y2, float z2, 
                           float r, float g, float b, float a, int light, int overlay) {
        
        // Bottom face (y = y1)
        addQuad(matrix, normalMatrix, builder, x1, y1, z1, x2, y1, z1, x2, y1, z2, x1, y1, z2, 
               0, -1, 0, r, g, b, a, light, overlay);
        
        // Top face (y = y2)
        addQuad(matrix, normalMatrix, builder, x1, y2, z1, x1, y2, z2, x2, y2, z2, x2, y2, z1, 
               0, 1, 0, r, g, b, a, light, overlay);
        
        // North face (z = z1)
        addQuad(matrix, normalMatrix, builder, x1, y1, z1, x1, y2, z1, x2, y2, z1, x2, y1, z1, 
               0, 0, -1, r, g, b, a, light, overlay);
        
        // South face (z = z2)
        addQuad(matrix, normalMatrix, builder, x1, y1, z2, x2, y1, z2, x2, y2, z2, x1, y2, z2, 
               0, 0, 1, r, g, b, a, light, overlay);
        
        // West face (x = x1)
        addQuad(matrix, normalMatrix, builder, x1, y1, z1, x1, y1, z2, x1, y2, z2, x1, y2, z1, 
               -1, 0, 0, r, g, b, a, light, overlay);
        
        // East face (x = x2)
        addQuad(matrix, normalMatrix, builder, x2, y1, z1, x2, y2, z1, x2, y2, z2, x2, y1, z2, 
               1, 0, 0, r, g, b, a, light, overlay);
    }

    private void renderCylinder(Matrix4f matrix, Matrix3f normalMatrix, VertexConsumer builder, 
                               float x1, float y1, float z1, float x2, float y2, float z2, 
                               float r, float g, float b, float a, int light, int overlay) {
        // Simplified cylinder as octagon for performance
        float centerX = (x1 + x2) / 2;
        float centerZ = (z1 + z2) / 2;
        float radius = (x2 - x1) / 2;
        int segments = 8;
        
        for (int i = 0; i < segments; i++) {
            float angle1 = (float) (2 * Math.PI * i / segments);
            float angle2 = (float) (2 * Math.PI * (i + 1) / segments);
            
            float x1Cyl = centerX + radius * Mth.cos(angle1);
            float z1Cyl = centerZ + radius * Mth.sin(angle1);
            float x2Cyl = centerX + radius * Mth.cos(angle2);
            float z2Cyl = centerZ + radius * Mth.sin(angle2);
            
            // Side face of cylinder segment
            addQuad(matrix, normalMatrix, builder, x1Cyl, y1, z1Cyl, x1Cyl, y2, z1Cyl, 
                   x2Cyl, y2, z2Cyl, x2Cyl, y1, z2Cyl, 
                   Mth.cos((angle1 + angle2) / 2), 0, Mth.sin((angle1 + angle2) / 2), 
                   r, g, b, a, light, overlay);
        }
        
        // Top and bottom circles (simplified as octagons)
        // Top face
        for (int i = 0; i < segments; i++) {
            float angle1 = (float) (2 * Math.PI * i / segments);
            float angle2 = (float) (2 * Math.PI * (i + 1) / segments);
            
            float x1Cyl = centerX + radius * Mth.cos(angle1);
            float z1Cyl = centerZ + radius * Mth.sin(angle1);
            float x2Cyl = centerX + radius * Mth.cos(angle2);
            float z2Cyl = centerZ + radius * Mth.sin(angle2);
            
            addTriangle(matrix, normalMatrix, builder, centerX, y2, centerZ, 
                       x1Cyl, y2, z1Cyl, x2Cyl, y2, z2Cyl, 
                       0, 1, 0, r, g, b, a, light, overlay);
        }
    }

    private void renderSlopedFace(Matrix4f matrix, Matrix3f normalMatrix, VertexConsumer builder, 
                                 float r, float g, float b, float a, int light, int overlay) {
        // Sloped face connecting front bottom to back top
        addQuad(matrix, normalMatrix, builder, 0, 0.3f, 0, 1, 0.3f, 0, 1, 0.6f, 0.5f, 0, 0.6f, 0.5f, 
               0, 0.6f, -0.8f, r, g, b, a, light, overlay); // Approximated normal
    }

    private void addQuad(Matrix4f matrix, Matrix3f normalMatrix, VertexConsumer builder, 
                        float x1, float y1, float z1, float x2, float y2, float z2, 
                        float x3, float y3, float z3, float x4, float y4, float z4, 
                        float nx, float ny, float nz, float r, float g, float b, float a, 
                        int light, int overlay) {
        addVertex(matrix, normalMatrix, builder, x1, y1, z1, 0, 0, nx, ny, nz, r, g, b, a, light, overlay);
        addVertex(matrix, normalMatrix, builder, x2, y2, z2, 1, 0, nx, ny, nz, r, g, b, a, light, overlay);
        addVertex(matrix, normalMatrix, builder, x3, y3, z3, 1, 1, nx, ny, nz, r, g, b, a, light, overlay);
        addVertex(matrix, normalMatrix, builder, x4, y4, z4, 0, 1, nx, ny, nz, r, g, b, a, light, overlay);
    }

    private void addTriangle(Matrix4f matrix, Matrix3f normalMatrix, VertexConsumer builder, 
                           float x1, float y1, float z1, float x2, float y2, float z2, 
                           float x3, float y3, float z3, float nx, float ny, float nz, 
                           float r, float g, float b, float a, int light, int overlay) {
        addVertex(matrix, normalMatrix, builder, x1, y1, z1, 0.5f, 0.5f, nx, ny, nz, r, g, b, a, light, overlay);
        addVertex(matrix, normalMatrix, builder, x2, y2, z2, 0, 1, nx, ny, nz, r, g, b, a, light, overlay);
        addVertex(matrix, normalMatrix, builder, x3, y3, z3, 1, 1, nx, ny, nz, r, g, b, a, light, overlay);
        // Add a degenerate fourth vertex to complete the quad
        addVertex(matrix, normalMatrix, builder, x3, y3, z3, 1, 1, nx, ny, nz, r, g, b, a, light, overlay);
    }

    private void addVertex(Matrix4f matrix, Matrix3f normalMatrix, VertexConsumer builder, 
                          float x, float y, float z, float u, float v, 
                          float nx, float ny, float nz, float r, float g, float b, float a, 
                          int light, int overlay) {
        builder.vertex(matrix, x, y, z)
               .color(r, g, b, a)
               .uv(u, v)
               .overlayCoords(overlay)
               .uv2(light)
               .normal(normalMatrix, nx, ny, nz)
               .endVertex();
    }

    @Override
    public boolean shouldRenderOffScreen(LegoBlockTileEntity tileEntity) {
        return true;
    }

    @Override
    public int getViewDistance() {
        return 256;
    }
}
